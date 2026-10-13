package com.school.marks.controller;

import com.school.marks.model.AuditLog;
import com.school.marks.model.Subject;
import com.school.marks.model.User;
import com.school.marks.repository.*;
import com.school.marks.service.AuditService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Superadmin-only API ("Control Room"). Locked to SUPERADMIN in SecurityConfig.
 * Superadmins also pass every /api/admin/** and /api/reports/** rule, so this
 * controller only holds what admins can't do.
 */
@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
public class SuperAdminController {

    private static final ZoneId NAIROBI = ZoneId.of("Africa/Nairobi");
    private static final Set<String> LEVELS =
            Set.of("pre_primary", "lower_primary", "upper_primary", "junior_secondary");
    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9._-]{3,30}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SubjectRepository subjectRepository;
    private final MarkRepository markRepository;
    private final TeacherSubjectAssignmentRepository assignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    // ════════════════════════════ OVERVIEW ════════════════════════════

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> overview() {
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime dayAgo     = now.minusHours(24);
        LocalDateTime weekAgo    = now.minusDays(7);
        LocalDateTime todayStart = nairobiDayStart(0);
        LocalDateTime since14    = nairobiDayStart(13);

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("activeTeachers", userRepository.countByRoleAndIsActiveTrue(User.Role.TEACHER));
        counts.put("activeAdmins",   userRepository.countByRoleAndIsActiveTrue(User.Role.ADMIN));
        counts.put("activeStudents", studentRepository.countByIsActiveTrue());
        counts.put("classes",        classRoomRepository.count());

        Map<String, Object> pulse = new LinkedHashMap<>();
        pulse.put("eventsToday",      auditLogRepository.countByTimestampAfter(todayStart));
        pulse.put("loginsToday",      auditLogRepository.countByActionAndTimestampAfter("LOGIN", todayStart));
        pulse.put("failedLogins24h",  auditLogRepository.countByActionAndTimestampAfter("LOGIN_FAILED", dayAgo));
        pulse.put("markChanges24h",   auditLogRepository.countByCategoryAndTimestampAfter(AuditService.MARKS, dayAgo));
        pulse.put("reportsToday",     auditLogRepository.countByCategoryAndTimestampAfter(AuditService.REPORTS, todayStart));
        pulse.put("usersSeenToday",   userRepository.countByLastLoginAfter(todayStart));

        // 14 days of activity, bucketed by Nairobi calendar day (zero-filled)
        Map<LocalDate, Long> perDay = new TreeMap<>();
        LocalDate todayNbo = LocalDate.now(NAIROBI);
        for (int i = 13; i >= 0; i--) perDay.put(todayNbo.minusDays(i), 0L);
        for (LocalDateTime ts : auditLogRepository.timestampsSince(since14)) {
            LocalDate d = ts.atZone(ZoneId.systemDefault()).withZoneSameInstant(NAIROBI).toLocalDate();
            perDay.computeIfPresent(d, (k, v) -> v + 1);
        }
        List<Map<String, Object>> activity = new ArrayList<>();
        perDay.forEach((d, c) -> activity.add(Map.<String, Object>of("date", d.toString(), "count", c)));

        List<Map<String, Object>> topActors = new ArrayList<>();
        for (Object[] row : auditLogRepository.topActorsSince(weekAgo, PageRequest.of(0, 6))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("username", row[0]);
            m.put("role", row[1]);
            m.put("count", row[2]);
            topActors.add(m);
        }

        List<Map<String, Object>> recent = auditLogRepository.findTop20ByOrderByTimestampDesc()
                .stream().map(this::toDto).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        body.put("pulse", pulse);
        body.put("activity", activity);
        body.put("topActors", topActors);
        body.put("recent", recent);
        return ResponseEntity.ok(body);
    }

    // ════════════════════════════ AUDIT LOG ════════════════════════════

    @GetMapping("/audit")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> auditLog(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String from,   // yyyy-MM-dd, Nairobi day
            @RequestParam(required = false) String to,     // yyyy-MM-dd, inclusive
            @RequestParam(required = false) String q) {

        int safeSize = Math.max(1, Math.min(size, 100));
        Page<AuditLog> result = auditLogRepository.findAll(
                auditFilter(category, action, actor, role, from, to, q),
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "timestamp", "logId")));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", result.getContent().stream().map(this::toDto).toList());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/audit/actors")
    public ResponseEntity<List<String>> auditActors() {
        return ResponseEntity.ok(auditLogRepository.findDistinctActors());
    }

    /** Same filters as /audit, as CSV (max 10,000 newest rows). */
    @GetMapping("/audit/export")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportAudit(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String q) {

        List<AuditLog> rows = auditLogRepository.findAll(
                auditFilter(category, action, actor, role, from, to, q),
                PageRequest.of(0, 10_000, Sort.by(Sort.Direction.DESC, "timestamp", "logId"))).getContent();

        StringBuilder csv = new StringBuilder("time_nairobi,category,action,user,role,description,old_value,new_value,ip\n");
        for (AuditLog a : rows) {
            csv.append(csvCell(toNairobi(a.getTimestamp()))).append(',')
               .append(csvCell(a.getCategory())).append(',')
               .append(csvCell(a.getAction())).append(',')
               .append(csvCell(a.getActorUsername())).append(',')
               .append(csvCell(a.getActorRole())).append(',')
               .append(csvCell(a.getDescription())).append(',')
               .append(csvCell(a.getOldValue())).append(',')
               .append(csvCell(a.getNewValue())).append(',')
               .append(csvCell(a.getIpAddress())).append('\n');
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename("activity_log_" + LocalDate.now(NAIROBI) + ".csv").build());
        // BOM so Excel opens UTF-8 (· and → characters) correctly
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] data = csv.toString().getBytes(StandardCharsets.UTF_8);
        byte[] out = new byte[bom.length + data.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(data, 0, out, bom.length, data.length);
        return ResponseEntity.ok().headers(headers).body(out);
    }

    // ════════════════════════════ ADMINS ════════════════════════════

    @GetMapping("/admins")
    public ResponseEntity<List<Map<String, Object>>> listAdmins() {
        List<User> users = new ArrayList<>(userRepository.findByRoleOrderByUsernameAsc(User.Role.SUPERADMIN));
        users.addAll(userRepository.findByRoleOrderByUsernameAsc(User.Role.ADMIN));
        return ResponseEntity.ok(users.stream().map(this::adminDto).toList());
    }

    @PostMapping("/admins")
    @Transactional
    public ResponseEntity<Map<String, Object>> createAdmin(@RequestBody Map<String, String> body) {
        String username = trim(body.get("username"));
        String fullName = trim(body.get("fullName"));

        if (fullName == null || fullName.length() < 2)
            throw new IllegalArgumentException("Full name is required");
        if (username == null || !USERNAME.matcher(username).matches())
            throw new IllegalArgumentException("Username must be 3–30 characters: letters, numbers, . _ -");
        if (userRepository.existsByUsername(username))
            throw new IllegalArgumentException("Username already exists");

        String tempPassword = generateTempPassword();
        User admin = User.builder()
                .username(username)
                .fullName(fullName)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role(User.Role.ADMIN)        // this endpoint can never create a SUPERADMIN
                .isFirstLogin(true)
                .isActive(true)
                .build();
        User saved = userRepository.save(admin);

        audit.record(AuditService.ADMINS, "CREATE", "users", saved.getUserId(),
                "Registered admin " + fullName + " (login: " + username + ")");

        Map<String, Object> res = new LinkedHashMap<>(adminDto(saved));
        res.put("tempPassword", tempPassword); // shown once, never stored in plain text
        return ResponseEntity.ok(res);
    }

    @PutMapping("/admins/{userId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateAdmin(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        User admin = requireAdminTarget(userId);
        String fullName = trim(body.get("fullName"));
        if (fullName == null || fullName.length() < 2) throw new IllegalArgumentException("Full name is required");
        String before = admin.getFullName();
        admin.setFullName(fullName);
        userRepository.save(admin);
        audit.record(AuditService.ADMINS, "UPDATE", "users", userId,
                "Renamed admin account " + admin.getUsername(), before, fullName);
        return ResponseEntity.ok(adminDto(admin));
    }

    @PostMapping("/admins/{userId}/deactivate")
    @Transactional
    public ResponseEntity<Map<String, Object>> deactivateAdmin(@PathVariable Long userId) {
        User admin = requireAdminTarget(userId);
        admin.setIsActive(false); // takes effect on their very next request (JwtFilter re-reads the user)
        userRepository.save(admin);
        audit.record(AuditService.ADMINS, "DEACTIVATE", "users", userId,
                "Deactivated admin " + admin.getDisplayName() + " (login: " + admin.getUsername() + ")");
        return ResponseEntity.ok(adminDto(admin));
    }

    @PostMapping("/admins/{userId}/activate")
    @Transactional
    public ResponseEntity<Map<String, Object>> activateAdmin(@PathVariable Long userId) {
        User admin = requireAdminTarget(userId);
        admin.setIsActive(true);
        userRepository.save(admin);
        audit.record(AuditService.ADMINS, "ACTIVATE", "users", userId,
                "Reactivated admin " + admin.getDisplayName() + " (login: " + admin.getUsername() + ")");
        return ResponseEntity.ok(adminDto(admin));
    }

    @PostMapping("/admins/{userId}/reset-password")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetAdminPassword(@PathVariable Long userId) {
        User admin = requireAdminTarget(userId);
        String tempPassword = generateTempPassword();
        admin.setPasswordHash(passwordEncoder.encode(tempPassword));
        admin.setIsFirstLogin(true);
        userRepository.save(admin);
        audit.record(AuditService.ADMINS, "RESET_PASSWORD", "users", userId,
                "Reset password for admin " + admin.getDisplayName() + " (login: " + admin.getUsername() + ")");
        Map<String, Object> res = new LinkedHashMap<>(adminDto(admin));
        res.put("tempPassword", tempPassword);
        return ResponseEntity.ok(res);
    }

    // ════════════════════════════ SUBJECTS ════════════════════════════

    @GetMapping("/subjects")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listSubjects() {
        Map<Long, Long> markCounts = new HashMap<>();
        for (Object[] row : markRepository.countPerSubject()) markCounts.put((Long) row[0], (Long) row[1]);

        List<Subject> all = subjectRepository.findAll(Sort.by("levelType", "subjectId"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Subject s : all) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subjectId", s.getSubjectId());
            m.put("subjectName", s.getSubjectName());
            m.put("levelType", s.getLevelType());
            m.put("isActive", s.isActiveSubject());
            m.put("markCount", markCounts.getOrDefault(s.getSubjectId(), 0L));
            out.add(m);
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping("/subjects")
    @Transactional
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> body) {
        String name  = trim(body.get("subjectName"));
        String level = trim(body.get("levelType"));
        validateSubject(name, level, null);

        Subject saved = subjectRepository.save(Subject.builder()
                .subjectName(name).levelType(level).isActive(true).build());

        audit.record(AuditService.SUBJECTS, "CREATE", "subjects", saved.getSubjectId(),
                "Added subject " + name + " · " + levelLabel(level));
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/subjects/{subjectId}")
    @Transactional
    public ResponseEntity<Subject> renameSubject(@PathVariable Long subjectId, @RequestBody Map<String, String> body) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        String name = trim(body.get("subjectName"));
        validateSubject(name, subject.getLevelType(), subjectId);

        String before = subject.getSubjectName();
        if (before.equals(name)) return ResponseEntity.ok(subject);
        subject.setSubjectName(name);
        Subject saved = subjectRepository.save(subject);

        audit.record(AuditService.SUBJECTS, "UPDATE", "subjects", subjectId,
                "Renamed subject · " + levelLabel(subject.getLevelType()), before, name);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/subjects/{subjectId}/archive")
    @Transactional
    public ResponseEntity<Map<String, Object>> archiveSubject(@PathVariable Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        subject.setIsActive(false);
        subjectRepository.save(subject);

        long marks = markRepository.countBySubject_SubjectId(subjectId);
        long assignments = assignmentRepository.countBySubject_SubjectId(subjectId);
        audit.record(AuditService.SUBJECTS, "ARCHIVE", "subjects", subjectId,
                "Archived " + subject.getSubjectName() + " · " + levelLabel(subject.getLevelType())
                        + " (" + marks + " historical marks kept)");

        return ResponseEntity.ok(Map.<String, Object>of(
                "message", subject.getSubjectName() + " archived",
                "marksKept", marks,
                "assignments", assignments));
    }

    @PostMapping("/subjects/{subjectId}/restore")
    @Transactional
    public ResponseEntity<Map<String, Object>> restoreSubject(@PathVariable Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        subject.setIsActive(true);
        subjectRepository.save(subject);
        audit.record(AuditService.SUBJECTS, "RESTORE", "subjects", subjectId,
                "Restored " + subject.getSubjectName() + " · " + levelLabel(subject.getLevelType()));
        return ResponseEntity.ok(Map.<String, Object>of("message", subject.getSubjectName() + " restored"));
    }

    // ════════════════════════════ helpers ════════════════════════════

    private Specification<AuditLog> auditFilter(String category, String action, String actor, String role,
                                                String from, String to, String q) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (notBlank(category)) p.add(cb.equal(root.get("category"), category.trim().toUpperCase()));
            if (notBlank(action))   p.add(cb.equal(root.get("action"), action.trim().toUpperCase()));
            if (notBlank(actor))    p.add(cb.equal(root.get("actorUsername"), actor.trim()));
            if (notBlank(role))     p.add(cb.equal(root.get("actorRole"), role.trim().toUpperCase()));
            if (notBlank(from))     p.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("timestamp"), nairobiDateToServer(LocalDate.parse(from.trim()))));
            if (notBlank(to))       p.add(cb.lessThan(root.<LocalDateTime>get("timestamp"), nairobiDateToServer(LocalDate.parse(to.trim()).plusDays(1))));
            if (notBlank(q)) {
                String like = "%" + q.trim().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.<String>get("description")), like, '\\'),
                        cb.like(cb.lower(root.<String>get("actorUsername")), like, '\\')));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    private Map<String, Object> toDto(AuditLog a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getLogId());
        m.put("at", a.getTimestamp() == null ? null
                : a.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toString());
        m.put("category", a.getCategory());
        m.put("action", a.getAction());
        m.put("actor", a.getActorUsername());
        m.put("actorRole", a.getActorRole());
        m.put("description", a.getDescription());
        m.put("oldValue", a.getOldValue());
        m.put("newValue", a.getNewValue());
        m.put("ip", a.getIpAddress());
        m.put("table", a.getTableName());
        m.put("recordId", a.getRecordId());
        return m;
    }

    private Map<String, Object> adminDto(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("userId", u.getUserId());
        m.put("username", u.getUsername());
        m.put("fullName", u.getDisplayName());
        m.put("role", u.getRole().name());
        m.put("isActive", u.getIsActive());
        m.put("mustChangePassword", u.getIsFirstLogin());
        m.put("lastLogin", u.getLastLogin() == null ? null
                : u.getLastLogin().atZone(ZoneId.systemDefault()).toInstant().toString());
        return m;
    }

    /** Only plain ADMIN accounts can be modified here. Superadmins are untouchable. */
    private User requireAdminTarget(Long userId) {
        User u = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Account not found"));
        if (u.getRole() == User.Role.SUPERADMIN)
            throw new AccessDeniedException("Super admin accounts cannot be modified or deactivated");
        if (u.getRole() != User.Role.ADMIN)
            throw new AccessDeniedException("Only admin accounts are managed here — teachers are managed on the Teachers page");
        return u;
    }

    private void validateSubject(String name, String level, Long excludeId) {
        if (name == null || name.length() < 2 || name.length() > 80)
            throw new IllegalArgumentException("Subject name must be 2–80 characters");
        if (level == null || !LEVELS.contains(level))
            throw new IllegalArgumentException("Unknown level");
        // Report cards key marks by subject name, so names must be unique within a level
        boolean duplicate = subjectRepository.findByLevelType(level).stream()
                .anyMatch(s -> s.getSubjectName().trim().equalsIgnoreCase(name)
                        && (excludeId == null || !s.getSubjectId().equals(excludeId)));
        if (duplicate)
            throw new IllegalArgumentException("\"" + name + "\" already exists for " + levelLabel(level)
                    + " (it may be archived — restore it instead)");
    }

    private static String levelLabel(String level) {
        return switch (level) {
            case "pre_primary"      -> "Pre-Primary";
            case "lower_primary"    -> "Lower Primary";
            case "upper_primary"    -> "Upper Primary";
            case "junior_secondary" -> "Junior Secondary";
            default -> level;
        };
    }

    /** Start of the Nairobi calendar day {@code daysAgo} days back, in server-local time. */
    private static LocalDateTime nairobiDayStart(int daysAgo) {
        return nairobiDateToServer(LocalDate.now(NAIROBI).minusDays(daysAgo));
    }

    private static LocalDateTime nairobiDateToServer(LocalDate nairobiDate) {
        return nairobiDate.atStartOfDay(NAIROBI).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private static String toNairobi(LocalDateTime serverTime) {
        if (serverTime == null) return "";
        return serverTime.atZone(ZoneId.systemDefault()).withZoneSameInstant(NAIROBI)
                .toLocalDateTime().withNano(0).toString().replace('T', ' ');
    }

    private static String generateTempPassword() {
        // No look-alike characters (0/O, 1/l/I) — it gets read out loud or copied by hand
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        return sb.toString();
    }

    private static String csvCell(String v) {
        if (v == null) return "";
        // Neutralise spreadsheet formula injection
        String s = (v.startsWith("=") || v.startsWith("+") || v.startsWith("-") || v.startsWith("@")) ? "'" + v : v;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private static String trim(String s) { return s == null ? null : s.trim(); }
}
