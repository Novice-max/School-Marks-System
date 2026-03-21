package com.school.marks.controller;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
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

    @GetMapping("/classes")
    public ResponseEntity<List<ClassRoom>> getAllClasses() { return ResponseEntity.ok(classRoomRepository.findAll()); }

    @PostMapping("/classes")
    public ResponseEntity<ClassRoom> createClass(@RequestBody ClassRoom classRoom) { return ResponseEntity.ok(classRoomRepository.save(classRoom)); }

    @GetMapping("/students")
    public ResponseEntity<List<Student>> getAllStudents() { return ResponseEntity.ok(studentRepository.findAll()); }

    @PostMapping("/students")
    public ResponseEntity<Student> createStudent(@RequestBody Map<String, Object> body) {
        ClassRoom classRoom = classRoomRepository.findById(
            Long.valueOf(((Map<?,?>)body.get("classRoom")).get("classId").toString())
        ).orElseThrow(() -> new RuntimeException("Class not found"));

        Student student = Student.builder()
                .firstName((String) body.get("firstName"))
                .lastName((String) body.get("lastName"))
                .admissionNumber((String) body.get("admissionNumber"))
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
        return ResponseEntity.ok(studentRepository.findByClassRoom_ClassIdAndIsActiveTrue(classId));
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() { return ResponseEntity.ok(subjectRepository.findAll()); }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject) { return ResponseEntity.ok(subjectRepository.save(subject)); }

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