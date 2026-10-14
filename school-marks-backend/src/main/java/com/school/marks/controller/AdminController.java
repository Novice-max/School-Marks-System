package com.school.marks.controller;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.security.PasswordPolicy;
import com.school.marks.security.TempPasswords;
import com.school.marks.service.AuditService;
import com.school.marks.service.AuthService;
import com.school.marks.service.MarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.ArrayList;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final TeacherRepository teacherRepository;
    private final ClassRoomRepository classRoomRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ExamRepository examRepository;
    private final TeacherSubjectAssignmentRepository assignmentRepository;
    private final MarkRepository markRepository;
    private final AuthService authService;
    private final MarkService markService;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AuditService audit;

    // ── Teachers ──
    @GetMapping("/teachers")
    public ResponseEntity<List<Teacher>> getAllTeachers() { return ResponseEntity.ok(teacherRepository.findAll()); }

    @PostMapping("/teachers")
    @Transactional // teacher + login account are created together or not at all
    public ResponseEntity<Map<String, String>> createTeacher(@RequestBody Map<String, String> body) {
        Teacher teacher = Teacher.builder()
                .firstName(body.get("firstName")).lastName(body.get("lastName"))
                .email(body.get("email")).phone(body.get("phone")).build();
        // Validate the username BEFORE saving anything (no spaces, 3–30 safe characters)
        String username = PasswordPolicy.validUsername(body.get("username"));
        Teacher saved = teacherRepository.save(teacher);
        String tempPassword = TempPasswords.generate(); // random, shown to the admin once, never stored in plain text
        User user = authService.createTeacherUser(username, saved, tempPassword);
        audit.record(AuditService.TEACHERS, "CREATE", "teachers", saved.getTeacherId(),
                "Created teacher " + saved.getFullName() + " (login: " + user.getUsername() + ")");
        // Key stays "defaultPassword" so the existing TeachersPage keeps working
        return ResponseEntity.ok(Map.of("message","Teacher created","defaultPassword",tempPassword,"username",user.getUsername()));
    }

    @PutMapping("/teachers/{teacherId}")
    @Transactional
    public ResponseEntity<Teacher> updateTeacher(@PathVariable Long teacherId, @RequestBody Map<String, String> body) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Teacher not found"));
        String before = teacherSnapshot(teacher);
        if (body.containsKey("firstName") && !body.get("firstName").isBlank()) teacher.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName")  && !body.get("lastName").isBlank())  teacher.setLastName(body.get("lastName"));
        if (body.containsKey("email"))    teacher.setEmail(body.get("email"));
        if (body.containsKey("phone"))    teacher.setPhone(body.get("phone"));
        Teacher saved = teacherRepository.save(teacher);
        audit.record(AuditService.TEACHERS, "UPDATE", "teachers", teacherId,
                "Edited teacher " + saved.getFullName(), before, teacherSnapshot(saved));
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/teachers/{teacherId}/reset-password")
    @Transactional
    public ResponseEntity<Map<String, String>> resetTeacherPassword(@PathVariable Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Teacher not found"));
        User user = userRepository.findByTeacher_TeacherId(teacherId)
            .orElseThrow(() -> new RuntimeException("User account not found"));
        String newPassword = TempPasswords.generate(); // was username+"123" — guessable by anyone who knew the pattern
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsFirstLogin(true);
        userRepository.save(user);
        audit.record(AuditService.TEACHERS, "RESET_PASSWORD", "users", user.getUserId(),
                "Reset password for " + teacher.getFullName() + " (login: " + user.getUsername() + ")");
        return ResponseEntity.ok(Map.of(
                "message", "Password reset successfully",
                "tempPassword", newPassword,
                "username", user.getUsername()));
    }

    @PostMapping("/teachers/{teacherId}/deactivate")
    @Transactional
    public ResponseEntity<String> deactivateTeacher(@PathVariable Long teacherId) {
        User user = userRepository.findByTeacher_TeacherId(teacherId)
                .orElseThrow(() -> new RuntimeException("User account not found"));
        user.setIsActive(false);
        userRepository.save(user);
        audit.record(AuditService.TEACHERS, "DEACTIVATE", "users", user.getUserId(),
                "Deactivated teacher " + user.getDisplayName());
        return ResponseEntity.ok("Teacher deactivated");
    }

    @PostMapping("/teachers/{teacherId}/activate")
    @Transactional
    public ResponseEntity<String> activateTeacher(@PathVariable Long teacherId) {
        User user = userRepository.findByTeacher_TeacherId(teacherId)
                .orElseThrow(() -> new RuntimeException("User account not found"));
        user.setIsActive(true);
        userRepository.save(user);
        audit.record(AuditService.TEACHERS, "ACTIVATE", "users", user.getUserId(),
                "Reactivated teacher " + user.getDisplayName());
        return ResponseEntity.ok("Teacher activated");
    }

    @GetMapping("/teachers/with-status")
    public ResponseEntity<List<Map<String, Object>>> getTeachersWithStatus() {
        List<Teacher> teachers = teacherRepository.findAll();
        List<Map<String, Object>> result = teachers.stream().map(t -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("teacherId", t.getTeacherId());
            map.put("firstName", t.getFirstName());
            map.put("lastName", t.getLastName());
            map.put("email", t.getEmail());
            map.put("phone", t.getPhone());
            userRepository.findByTeacher_TeacherId(t.getTeacherId())
                .ifPresent(u -> {
                    map.put("isActive", u.getIsActive());
                    map.put("username", u.getUsername());
                });
            if (!map.containsKey("isActive")) map.put("isActive", true);
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Classes ──
    @GetMapping("/classes")
    public ResponseEntity<List<ClassRoom>> getAllClasses() { return ResponseEntity.ok(classRoomRepository.findAll()); }

    @PostMapping("/classes")
    @Transactional
    public ResponseEntity<ClassRoom> createClass(@RequestBody ClassRoom classRoom) {
        ClassRoom saved = classRoomRepository.save(classRoom);
        audit.record(AuditService.CLASSES, "CREATE", "classes", saved.getClassId(),
                "Created class " + saved.getDisplayName() + " — " + saved.getAcademicYear());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/classes/{classId}")
    @Transactional
    public ResponseEntity<ClassRoom> updateClass(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found"));
        String before = classRoom.getAcademicYear();
        if (body.containsKey("academicYear") && !body.get("academicYear").isBlank())
            classRoom.setAcademicYear(body.get("academicYear"));
        ClassRoom saved = classRoomRepository.save(classRoom);
        audit.record(AuditService.CLASSES, "UPDATE", "classes", classId,
                "Changed academic year of " + saved.getDisplayName(), before, saved.getAcademicYear());
        return ResponseEntity.ok(saved);
    }

    // ── Students ──
    @GetMapping("/students")
    public ResponseEntity<List<Student>> getAllStudents() { return ResponseEntity.ok(studentRepository.findAll()); }

    @GetMapping("/students/search")
    public ResponseEntity<List<Student>> searchStudents(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(studentRepository.searchByNameOrAdmission(q.trim()));
    }

    @PostMapping("/students")
    @Transactional
    public ResponseEntity<?> createStudent(@RequestBody Map<String, Object> body) {
        String admNo = (String) body.get("admissionNumber");
        if (studentRepository.existsByAdmissionNumber(admNo)) {
            return ResponseEntity.badRequest().body(Map.of("message",
                "Admission number " + admNo + " already exists"));
        }

        ClassRoom classRoom = classRoomRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("classRoom")).get("classId").toString())
        ).orElseThrow(() -> new RuntimeException("Class not found"));

        Student student = Student.builder()
                .firstName((String) body.get("firstName"))
                .lastName((String) body.get("lastName"))
                .admissionNumber(admNo)
                .gender((String) body.get("gender"))
                .parentContact((String) body.get("parentContact"))
                .classRoom(classRoom)
                .isActive(true)
                .build();

        if (body.get("dateOfBirth") != null && !body.get("dateOfBirth").toString().isEmpty()) {
            student.setDateOfBirth(java.time.LocalDate.parse(body.get("dateOfBirth").toString()));
        }

        Student saved = studentRepository.save(student);
        audit.record(AuditService.STUDENTS, "CREATE", "students", saved.getStudentId(),
                "Added " + saved.getFullName() + " (" + saved.getAdmissionNumber() + ") to " + classRoom.getDisplayName());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/students/class/{classId}")
    public ResponseEntity<List<Student>> getStudentsByClass(@PathVariable Long classId) {
        return ResponseEntity.ok(studentRepository.findByClassRoom_ClassId(classId));
    }

    @GetMapping("/students/{studentId}/latest-marks")
    public ResponseEntity<?> getLatestMarks(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<Exam> exams = examRepository.findByClassRoom_ClassIdOrderByExamIdDesc(
                student.getClassRoom().getClassId());

        if (exams.isEmpty()) {
            return ResponseEntity.ok(Map.of("examName", "No exams", "marks", List.of()));
        }

        Exam latestExam = exams.get(0);

        List<Mark> marks = markRepository.findByStudent_StudentIdAndExam_ExamId(
                studentId, latestExam.getExamId());

        double avg = marks.stream()
                .mapToDouble(m -> m.getScore().doubleValue())
                .average().orElse(0);

        List<Map<String, Object>> markList = marks.stream().map(m -> Map.<String, Object>of(
                "subject", m.getSubject().getSubjectName(),
                "score", m.getScore(),
                "grade", m.getGrade()
        )).toList();

        return ResponseEntity.ok(Map.of(
                "examName", latestExam.getExamName() + " T" + latestExam.getTerm(),
                "average", Math.round(avg * 100.0) / 100.0,
                "grade", marks.isEmpty() ? "—" : markService.calculateCbcGrade(java.math.BigDecimal.valueOf(avg)),
                "marks", markList
        ));
    }

    @PutMapping("/students/{studentId}")
    @Transactional
    public ResponseEntity<Student> updateStudent(@PathVariable Long studentId, @RequestBody Map<String, String> body) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        String before = studentSnapshot(student);
        if (body.containsKey("firstName")       && !body.get("firstName").isBlank())       student.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName")        && !body.get("lastName").isBlank())        student.setLastName(body.get("lastName"));
        if (body.containsKey("admissionNumber") && !body.get("admissionNumber").isBlank()) student.setAdmissionNumber(body.get("admissionNumber"));
        if (body.containsKey("gender"))          student.setGender(body.get("gender"));
        if (body.containsKey("parentContact"))   student.setParentContact(body.get("parentContact"));
        Student saved = studentRepository.save(student);
        audit.record(AuditService.STUDENTS, "UPDATE", "students", studentId,
                "Edited student " + saved.getFullName(), before, studentSnapshot(saved));
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/students/{studentId}/deactivate")
    @Transactional
    public ResponseEntity<String> deactivateStudent(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        student.setIsActive(false);
        studentRepository.save(student);
        audit.record(AuditService.STUDENTS, "DEACTIVATE", "students", studentId,
                "Deactivated " + student.getFullName() + " (" + student.getAdmissionNumber() + ")");
        return ResponseEntity.ok("Student deactivated");
    }

    @PostMapping("/students/{studentId}/activate")
    @Transactional
    public ResponseEntity<String> activateStudent(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        student.setIsActive(true);
        studentRepository.save(student);
        audit.record(AuditService.STUDENTS, "ACTIVATE", "students", studentId,
                "Reactivated " + student.getFullName() + " (" + student.getAdmissionNumber() + ")");
        return ResponseEntity.ok("Student activated");
    }

    // ── Subjects (read-only for admins — managed in /api/superadmin/subjects) ──
    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(subjectRepository.findAllActive());
    }

    // ── Exams ──
    @GetMapping("/exams")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Exam>> getAllExams() {
        return ResponseEntity.ok(examRepository.findAllByOrderByAcademicYearDescTermAscExamNameAsc());
    }

    @PostMapping("/exams")
    @Transactional
    public ResponseEntity<Exam> createExam(@RequestBody Map<String, Object> body) {
        ClassRoom classRoom = classRoomRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("classRoom")).get("classId").toString())
        ).orElseThrow(() -> new RuntimeException("Class not found"));

        Exam exam = Exam.builder()
                .examName((String) body.get("examName"))
                .term(Integer.valueOf(body.get("term").toString()))
                .academicYear((String) body.get("academicYear"))
                .classRoom(classRoom)
                .build();

        Exam saved = examRepository.save(exam);
        audit.record(AuditService.EXAMS, "CREATE", "exams", saved.getExamId(),
                "Created " + saved.getExamName() + " T" + saved.getTerm() + " " + saved.getAcademicYear()
                        + " for " + classRoom.getDisplayName());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/exams/school")
    @Transactional
    public ResponseEntity<?> createSchoolExam(@RequestBody Map<String, Object> body) {
        String examName     = (String) body.get("examName");
        Integer term        = Integer.parseInt(body.get("term").toString());
        String academicYear = (String) body.get("academicYear");
        if (examRepository.existsByExamNameAndTermAndAcademicYear(examName, term, academicYear))
            return ResponseEntity.badRequest().body(Map.of("message", examName + " already exists for Term " + term + " " + academicYear));
        List<ClassRoom> classes = classRoomRepository.findByAcademicYear(academicYear);
        if (classes.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "No classes found for " + academicYear));
        List<Exam> created = new ArrayList<>();
        for (ClassRoom cr : classes) {
            Exam exam = new Exam();
            exam.setExamName(examName);
            exam.setTerm(term);
            exam.setAcademicYear(academicYear);
            exam.setClassRoom(cr);
            created.add(examRepository.save(exam));
        }
        audit.record(AuditService.EXAMS, "CREATE", "exams", null,
                "Created " + examName + " T" + term + " " + academicYear + " for " + created.size() + " classes");
        return ResponseEntity.ok(Map.of("message", examName + " created for " + created.size() + " classes", "count", created.size()));
    }

    @DeleteMapping("/exams/school/{examName}/{term}/{academicYear}")
    @Transactional
    public ResponseEntity<?> deleteSchoolExam(
            @PathVariable String examName,
            @PathVariable Integer term,
            @PathVariable String academicYear) {
        List<Exam> exams = examRepository.findByExamNameAndTermAndAcademicYear(examName, term, academicYear);
        if (exams.isEmpty()) return ResponseEntity.notFound().build();
        long marksDeleted = 0;
        for (Exam exam : exams) {
            marksDeleted += markRepository.countByExam_ExamId(exam.getExamId());
            markRepository.deleteByExam_ExamId(exam.getExamId());
        }
        examRepository.deleteAll(exams);
        audit.record(AuditService.EXAMS, "DELETE", "exams", null,
                "Deleted " + examName + " T" + term + " " + academicYear + " for " + exams.size()
                        + " classes — " + marksDeleted + " marks permanently removed");
        return ResponseEntity.ok(Map.of("message", examName + " deleted for " + exams.size() + " classes"));
    }

    // ── Assignments ──
    @PostMapping("/assign")
    @Transactional
    public ResponseEntity<TeacherSubjectAssignment> assignTeacher(@RequestBody Map<String, Object> body) {
        Teacher teacher = teacherRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("teacher")).get("teacherId").toString())
        ).orElseThrow(() -> new RuntimeException("Teacher not found"));

        Subject subject = subjectRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("subject")).get("subjectId").toString())
        ).orElseThrow(() -> new RuntimeException("Subject not found"));

        if (!subject.isActiveSubject()) {
            throw new RuntimeException(subject.getSubjectName() + " has been archived and can't be assigned");
        }

        ClassRoom classRoom = classRoomRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("classRoom")).get("classId").toString())
        ).orElseThrow(() -> new RuntimeException("Class not found"));

        TeacherSubjectAssignment assignment = TeacherSubjectAssignment.builder()
                .teacher(teacher)
                .subject(subject)
                .classRoom(classRoom)
                .academicYear((String) body.get("academicYear"))
                .term(Integer.valueOf(body.get("term").toString()))
                .build();

        TeacherSubjectAssignment saved = assignmentRepository.save(assignment);
        audit.record(AuditService.ASSIGNMENTS, "CREATE", "teacher_subject_assignments", saved.getAssignmentId(),
                "Assigned " + teacher.getFullName() + " → " + subject.getSubjectName() + " · "
                        + classRoom.getDisplayName() + " · T" + saved.getTerm() + " " + saved.getAcademicYear());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/assignments/teacher/{teacherId}")
    public ResponseEntity<List<TeacherSubjectAssignment>> getTeacherAssignments(@PathVariable Long teacherId) {
        return ResponseEntity.ok(assignmentRepository.findByTeacher_TeacherId(teacherId));
    }

    @DeleteMapping("/assign/{assignmentId}")
    @Transactional
    public ResponseEntity<String> removeAssignment(@PathVariable Long assignmentId) {
        assignmentRepository.findById(assignmentId).ifPresent(a ->
            audit.record(AuditService.ASSIGNMENTS, "DELETE", "teacher_subject_assignments", assignmentId,
                    "Removed " + a.getTeacher().getFullName() + " from " + a.getSubject().getSubjectName() + " · "
                            + a.getClassRoom().getDisplayName() + " · T" + a.getTerm() + " " + a.getAcademicYear()));
        assignmentRepository.deleteById(assignmentId);
        return ResponseEntity.ok("Assignment removed");
    }

    // ── audit snapshots (no sensitive fields) ──

    private static String teacherSnapshot(Teacher t) {
        return "name=" + t.getFullName() + "; email=" + nz(t.getEmail()) + "; phone=" + nz(t.getPhone());
    }

    private static String studentSnapshot(Student s) {
        return "name=" + s.getFullName() + "; adm=" + nz(s.getAdmissionNumber()) + "; gender=" + nz(s.getGender())
                + "; parentContact=" + nz(s.getParentContact());
    }

    private static String nz(String v) { return v == null ? "" : v; }
}
