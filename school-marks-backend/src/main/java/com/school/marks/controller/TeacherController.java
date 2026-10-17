package com.school.marks.controller;
import com.school.marks.dto.*;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.service.MarkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Teacher endpoints. Admins/superadmins may call them too (admin tooling uses
 * /teacher/exams/class/{id}); for TEACHER accounts every read is checked against
 * the teacher's own assignments, so changing an ID in the URL no longer exposes
 * another class's students or marks.
 */
@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {
    private final MarkService markService;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ExamRepository examRepository;
    private final MarkRepository markRepository;
    private final TeacherSubjectAssignmentRepository assignmentRepository;

    private static final BigDecimal MIN_SCORE = BigDecimal.ZERO;
    private static final BigDecimal MAX_SCORE = new BigDecimal("100");

    @PostMapping("/marks")
    public ResponseEntity<?> enterMark(@AuthenticationPrincipal UserDetails ud, @Valid @RequestBody MarkEntryDTO dto) {
        if (dto.getScore() != null) {
            if (dto.getScore().compareTo(MIN_SCORE) < 0 || dto.getScore().compareTo(MAX_SCORE) > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Score must be between 0 and 100"));
            }
        }
        return ResponseEntity.ok(markService.enterOrUpdateMark(dto, ud.getUsername()));
    }

    @PostMapping("/marks/bulk")
    public ResponseEntity<?> enterMarksBulk(@AuthenticationPrincipal UserDetails ud, @RequestBody List<MarkEntryDTO> marks) {
        if (marks == null || marks.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No marks to save"));
        }
        if (marks.size() > 300) {   // a class is ~30–50; anything this big is not a real save
            return ResponseEntity.badRequest().body(Map.of("message", "Too many marks in one save"));
        }
        // Validate ALL marks before saving any — fail fast
        for (MarkEntryDTO dto : marks) {
            if (dto.getScore() != null) {
                if (dto.getScore().compareTo(MIN_SCORE) < 0 || dto.getScore().compareTo(MAX_SCORE) > 0) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Score must be between 0 and 100. Found invalid value: " + dto.getScore()
                    ));
                }
            }
        }
        // One transaction for the whole class: all marks save, or none do
        MarkService.BulkSaveResult result = markService.enterMarksBulk(marks, ud.getUsername());
        return ResponseEntity.ok(Map.of(
                "message", "Marks saved successfully",
                "saved", result.saved(),
                "unchanged", result.unchanged()));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<TeacherSubjectAssignment>> getMyAssignments(@AuthenticationPrincipal UserDetails ud) {
        User user = userRepository.findByUsername(ud.getUsername()).orElseThrow();
        if (user.getTeacher() == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(markService.getTeacherAssignments(user.getTeacher().getTeacherId()));
    }

    @GetMapping("/students/class/{classId}")
    public ResponseEntity<List<Student>> getStudents(@AuthenticationPrincipal UserDetails ud, @PathVariable Long classId) {
        requireClassAccess(ud, classId);
        return ResponseEntity.ok(studentRepository.findByClassRoom_ClassIdAndIsActiveTrue(classId));
    }

    @GetMapping("/analytics/subject/{examId}/{subjectId}")
    public ResponseEntity<Map<String, Object>> getSubjectAnalytics(@AuthenticationPrincipal UserDetails ud,
                                                                   @PathVariable Long examId, @PathVariable Long subjectId) {
        requireSubjectAccess(ud, examId, subjectId);
        return ResponseEntity.ok(markService.getSubjectAnalytics(examId, subjectId));
    }

    @GetMapping("/marklist/{examId}")
    public ResponseEntity<List<StudentMarkSummaryDTO>> getMarklist(@AuthenticationPrincipal UserDetails ud,
                                                                   @PathVariable Long examId) {
        Exam exam = examRepository.findById(examId).orElseThrow(() -> new RuntimeException("Exam not found"));
        requireClassAccess(ud, exam.getClassRoom().getClassId());
        return ResponseEntity.ok(markService.getClassMarkList(examId));
    }

    @GetMapping("/exams/class/{classId}")
    public ResponseEntity<List<Exam>> getExamsByClass(@AuthenticationPrincipal UserDetails ud, @PathVariable Long classId) {
        requireClassAccess(ud, classId);
        return ResponseEntity.ok(examRepository.findByClassRoom_ClassId(classId));
    }

    @GetMapping("/marks/{examId}/{subjectId}")
    public ResponseEntity<List<Mark>> getMarksByExamAndSubject(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long examId,
        @PathVariable Long subjectId) {
        requireSubjectAccess(ud, examId, subjectId);
        return ResponseEntity.ok(markRepository.findByExam_ExamIdAndSubject_SubjectId(examId, subjectId));
    }

    // ── ownership checks (no-ops for ADMIN / SUPERADMIN) ──

    /** Returns the teacher's id, or null if the caller is an admin. */
    private Long teacherIdOrNullForAdmin(UserDetails ud) {
        User user = userRepository.findByUsername(ud.getUsername())
                .orElseThrow(() -> new AccessDeniedException("Unknown user"));
        if (user.getRole() != User.Role.TEACHER) return null;
        if (user.getTeacher() == null) throw new AccessDeniedException("No teacher profile linked to this account");
        return user.getTeacher().getTeacherId();
    }

    private void requireClassAccess(UserDetails ud, Long classId) {
        Long teacherId = teacherIdOrNullForAdmin(ud);
        if (teacherId == null) return;
        if (!assignmentRepository.existsByTeacher_TeacherIdAndClassRoom_ClassId(teacherId, classId)) {
            throw new AccessDeniedException("You are not assigned to this class");
        }
    }

    private void requireSubjectAccess(UserDetails ud, Long examId, Long subjectId) {
        Long teacherId = teacherIdOrNullForAdmin(ud);
        if (teacherId == null) return;
        Exam exam = examRepository.findById(examId).orElseThrow(() -> new RuntimeException("Exam not found"));
        if (!assignmentRepository.existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassId(
                teacherId, subjectId, exam.getClassRoom().getClassId())) {
            throw new AccessDeniedException("You are not assigned to this subject for this class");
        }
    }
}
