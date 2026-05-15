package com.school.marks.controller;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;

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
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    // ── Teachers ──
    @GetMapping("/teachers")
    public ResponseEntity<List<Teacher>> getAllTeachers() { return ResponseEntity.ok(teacherRepository.findAll()); }

    @PostMapping("/teachers")
    public ResponseEntity<Map<String, String>> createTeacher(@RequestBody Map<String, String> body) {
        Teacher teacher = Teacher.builder()
                .firstName(body.get("firstName")).lastName(body.get("lastName"))
                .email(body.get("email")).phone(body.get("phone")).build();
        Teacher saved = teacherRepository.save(teacher);
        String username = body.get("username");
        authService.createTeacherUser(username, saved);
        return ResponseEntity.ok(Map.of("message","Teacher created","defaultPassword",username+"123","username",username));
    }

    @PutMapping("/teachers/{teacherId}")
    public ResponseEntity<Teacher> updateTeacher(@PathVariable Long teacherId, @RequestBody Map<String, String> body) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Teacher not found"));
        if (body.containsKey("firstName") && !body.get("firstName").isBlank()) teacher.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName")  && !body.get("lastName").isBlank())  teacher.setLastName(body.get("lastName"));
        if (body.containsKey("email"))    teacher.setEmail(body.get("email"));
        if (body.containsKey("phone"))    teacher.setPhone(body.get("phone"));
        return ResponseEntity.ok(teacherRepository.save(teacher));
    }

    @PostMapping("/teachers/{teacherId}/reset-password")
    public ResponseEntity<Map<String, String>> resetTeacherPassword(@PathVariable Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Teacher not found"));
        User user = userRepository.findByTeacher_TeacherId(teacherId)
            .orElseThrow(() -> new RuntimeException("User account not found"));
        String newPassword = user.getUsername() + "123";
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsFirstLogin(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully", "tempPassword", newPassword));
    }

    @PostMapping("/teachers/{teacherId}/deactivate")
    public ResponseEntity<String> deactivateTeacher(@PathVariable Long teacherId) {
        User user = userRepository.findByTeacher_TeacherId(teacherId)
                .orElseThrow(() -> new RuntimeException("User account not found"));
        user.setIsActive(false);
        userRepository.save(user);
        return ResponseEntity.ok("Teacher deactivated");
    }

    @PostMapping("/teachers/{teacherId}/activate")
    public ResponseEntity<String> activateTeacher(@PathVariable Long teacherId) {
        User user = userRepository.findByTeacher_TeacherId(teacherId)
                .orElseThrow(() -> new RuntimeException("User account not found"));
        user.setIsActive(true);
        userRepository.save(user);
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
                .ifPresent(u -> map.put("isActive", u.getIsActive()));
            if (!map.containsKey("isActive")) map.put("isActive", true);
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Classes ──
    @GetMapping("/classes")
    public ResponseEntity<List<ClassRoom>> getAllClasses() { return ResponseEntity.ok(classRoomRepository.findAll()); }

    @PostMapping("/classes")
    public ResponseEntity<ClassRoom> createClass(@RequestBody ClassRoom classRoom) { return ResponseEntity.ok(classRoomRepository.save(classRoom)); }

    @PutMapping("/classes/{classId}")
    public ResponseEntity<ClassRoom> updateClass(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found"));
        if (body.containsKey("academicYear") && !body.get("academicYear").isBlank())
            classRoom.setAcademicYear(body.get("academicYear"));
        return ResponseEntity.ok(classRoomRepository.save(classRoom));
    }

    // ── Students ──
    @GetMapping("/students")
    public ResponseEntity<List<Student>> getAllStudents() { return ResponseEntity.ok(studentRepository.findAll()); }

    @PostMapping("/students")
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

    return ResponseEntity.ok(studentRepository.save(student));
}

    @GetMapping("/students/class/{classId}")
    public ResponseEntity<List<Student>> getStudentsByClass(@PathVariable Long classId) {
        // Return ALL students (active + inactive) so admin can see deactivated ones
        return ResponseEntity.ok(studentRepository.findByClassRoom_ClassId(classId));
    }

    @PutMapping("/students/{studentId}")
    public ResponseEntity<Student> updateStudent(@PathVariable Long studentId, @RequestBody Map<String, String> body) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        if (body.containsKey("firstName")       && !body.get("firstName").isBlank())       student.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName")        && !body.get("lastName").isBlank())        student.setLastName(body.get("lastName"));
        if (body.containsKey("admissionNumber") && !body.get("admissionNumber").isBlank()) student.setAdmissionNumber(body.get("admissionNumber"));
        if (body.containsKey("gender"))          student.setGender(body.get("gender"));
        if (body.containsKey("parentContact"))   student.setParentContact(body.get("parentContact"));
        return ResponseEntity.ok(studentRepository.save(student));
    }

    @PostMapping("/students/{studentId}/deactivate")
    public ResponseEntity<String> deactivateStudent(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        student.setIsActive(false);
        studentRepository.save(student);
        return ResponseEntity.ok("Student deactivated");
    }

    @PostMapping("/students/{studentId}/activate")
    public ResponseEntity<String> activateStudent(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        student.setIsActive(true);
        studentRepository.save(student);
        return ResponseEntity.ok("Student activated");
    }

    // ── Subjects ──
    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() { return ResponseEntity.ok(subjectRepository.findAll()); }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject) { return ResponseEntity.ok(subjectRepository.save(subject)); }

    // ── Exams ──
    @GetMapping("/exams")
    public ResponseEntity<List<Exam>> getAllExams() { return ResponseEntity.ok(examRepository.findAll()); }

    @PostMapping("/exams")
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

        return ResponseEntity.ok(examRepository.save(exam));
    }

    // ── Assignments ──
    @PostMapping("/assign")
    public ResponseEntity<TeacherSubjectAssignment> assignTeacher(@RequestBody Map<String, Object> body) {
        Teacher teacher = teacherRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("teacher")).get("teacherId").toString())
        ).orElseThrow(() -> new RuntimeException("Teacher not found"));

        Subject subject = subjectRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("subject")).get("subjectId").toString())
        ).orElseThrow(() -> new RuntimeException("Subject not found"));

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

        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    @GetMapping("/assignments/teacher/{teacherId}")
    public ResponseEntity<List<TeacherSubjectAssignment>> getTeacherAssignments(@PathVariable Long teacherId) {
        return ResponseEntity.ok(assignmentRepository.findByTeacher_TeacherId(teacherId));
    }

    @DeleteMapping("/assign/{assignmentId}")
    public ResponseEntity<String> removeAssignment(@PathVariable Long assignmentId) {
        assignmentRepository.deleteById(assignmentId);
        return ResponseEntity.ok("Assignment removed");
    }
}