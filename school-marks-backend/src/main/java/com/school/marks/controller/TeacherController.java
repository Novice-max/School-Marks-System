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

    @PostMapping("/marks")
    public ResponseEntity<Mark> enterMark(@AuthenticationPrincipal UserDetails ud, @Valid @RequestBody MarkEntryDTO dto) {
        return ResponseEntity.ok(markService.enterOrUpdateMark(dto, ud.getUsername()));
    }

    @PostMapping("/marks/bulk")
    public ResponseEntity<String> enterMarksBulk(@AuthenticationPrincipal UserDetails ud, @RequestBody List<MarkEntryDTO> marks) {
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
}
