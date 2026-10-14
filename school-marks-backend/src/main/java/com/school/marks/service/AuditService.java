package com.school.marks.service;

import com.school.marks.model.AuditLog;
import com.school.marks.model.User;
import com.school.marks.repository.AuditLogRepository;
import com.school.marks.repository.UserRepository;
import com.school.marks.security.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Single entry point for writing the audit trail.
 *
 * Runs inside the caller's transaction (REQUIRED): if the change rolls back,
 * its audit row rolls back with it, so the log never records something that
 * didn't happen. Callers outside a transaction (login, logout, report
 * downloads) get a transaction of their own.
 *
 * Passwords, password hashes and tokens are never passed in here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    // Categories
    public static final String AUTH        = "AUTH";
    public static final String MARKS       = "MARKS";
    public static final String STUDENTS    = "STUDENTS";
    public static final String TEACHERS    = "TEACHERS";
    public static final String ADMINS      = "ADMINS";
    public static final String CLASSES     = "CLASSES";
    public static final String SUBJECTS    = "SUBJECTS";
    public static final String EXAMS       = "EXAMS";
    public static final String ASSIGNMENTS = "ASSIGNMENTS";
    public static final String REPORTS     = "REPORTS";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /** Event performed by the currently authenticated user. */
    @Transactional
    public void record(String category, String action, String tableName, Long recordId,
                       String description, String oldValue, String newValue) {
        User actor = currentUser();
        write(actor, actor != null ? actor.getUsername() : null, category, action, tableName,
              recordId, description, oldValue, newValue);
    }

    /** Short form for events with no before/after values. */
    @Transactional
    public void record(String category, String action, String tableName, Long recordId, String description) {
        record(category, action, tableName, recordId, description, null, null);
    }

    /** Event for an explicitly known user (login, where the security context isn't set yet). */
    @Transactional
    public void recordFor(User actor, String category, String action, String description) {
        write(actor, actor != null ? actor.getUsername() : null, category, action, "users",
              actor != null ? actor.getUserId() : null, description, null, null);
    }

    /**
     * Failed login. A real username is stored as-is (wrong password).
     * An unknown one is masked — people often type their PASSWORD into the
     * username box ("Violet123"), and that must never sit in the log in plain text.
     */
    @Transactional
    public void recordFailedLogin(String attemptedUsername, String reason) {
        String typed = attemptedUsername == null ? "" : attemptedUsername.trim();
        User known = typed.isEmpty() ? null : userRepository.findByUsername(typed).orElse(null);

        String name;
        if (known != null) {
            name = known.getUsername();
        } else if (typed.isEmpty()) {
            name = null;
        } else {
            int keep = Math.min(2, typed.length());
            int hidden = Math.min(typed.length() - keep, 20);
            name = typed.substring(0, keep) + "\u2022".repeat(hidden) + " (unknown)";
        }
        write(known, name, AUTH, "LOGIN_FAILED", "users",
              known != null ? known.getUserId() : null, reason, null, null);
    }

    // ── internals ──

    private void write(User actor, String actorUsername, String category, String action, String tableName,
                       Long recordId, String description, String oldValue, String newValue) {
        AuditLog entry = AuditLog.builder()
                .user(actor)
                .actorUsername(actorUsername)
                .actorRole(actor != null ? actor.getRole().name() : null)
                .category(category)
                .action(action)
                .tableName(tableName)
                .recordId(recordId)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(clientIp())
                .build();
        auditLogRepository.save(entry);
    }

    public User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) return null;
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private String clientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            // Same resolution as the rate limiter: the real client, not a header the client can fake
            String ip = ClientIp.resolve(req);
            return ip == null ? null : ip.substring(0, Math.min(ip.length(), 64));
        } catch (Exception e) {
            return null;
        }
    }
}
