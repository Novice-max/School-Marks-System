package com.school.marks.controller;
import com.school.marks.dto.*;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.service.MarkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {
    private final MarkService markService;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ExamRepository examRepository;
    private final MarkRepository markRepository;

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
        for (MarkEntryDTO dto : marks) markService.enterOrUpdateMark(dto, ud.getUsername());
        return ResponseEntity.ok("Marks saved successfully");
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<TeacherSubjectAssignment>> getMyAssignments(@AuthenticationPrincipal UserDetails ud) {
        User user = userRepository.findByUsername(ud.getUsername()).orElseThrow();
        return ResponseEntity.ok(markService.getTeacherAssignments(user.getTeacher().getTeacherId()));
    }

    @GetMapping("/students/class/{classId}")
    public ResponseEntity<List<Student>> getStudents(@PathVariable Long classId) {
        return ResponseEntity.ok(studentRepository.findByClassRoom_ClassIdAndIsActiveTrue(classId));
    }

    @GetMapping("/analytics/subject/{examId}/{subjectId}")
    public ResponseEntity<Map<String, Object>> getSubjectAnalytics(@PathVariable Long examId, @PathVariable Long subjectId) {
        return ResponseEntity.ok(markService.getSubjectAnalytics(examId, subjectId));
    }

    @GetMapping("/marklist/{examId}")
    public ResponseEntity<List<StudentMarkSummaryDTO>> getMarklist(@PathVariable Long examId) {
        return ResponseEntity.ok(markService.getClassMarkList(examId));
    }

    @GetMapping("/exams/class/{classId}")
    public ResponseEntity<List<Exam>> getExamsByClass(@PathVariable Long classId) {
        return ResponseEntity.ok(examRepository.findByClassRoom_ClassId(classId));
    }

    @GetMapping("/marks/{examId}/{subjectId}")
    public ResponseEntity<List<Mark>> getMarksByExamAndSubject(
        @PathVariable Long examId,
        @PathVariable Long subjectId) {
        return ResponseEntity.ok(markRepository.findByExam_ExamIdAndSubject_SubjectId(examId, subjectId));
    }
}