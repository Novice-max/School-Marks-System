package com.school.marks.controller;

import com.school.marks.dto.StudentMarkSummaryDTO;
import com.school.marks.repository.*;
import com.school.marks.service.MarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final MarkRepository markRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ExamRepository examRepository;
    private final MarkService markService;

    // ── School-wide grade distribution (pie chart) ──
    @GetMapping("/grade-distribution/{examId}")
    public ResponseEntity<Map<String, Long>> getGradeDistribution(@PathVariable Long examId) {
        var marks = markRepository.findByExamIdAndClassId(examId,
                examRepository.findById(examId)
                        .orElseThrow(() -> new RuntimeException("Exam not found"))
                        .getClassRoom().getClassId());

        Map<String, Long> distribution = marks.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getGrade() != null ? m.getGrade() : "N/A",
                        Collectors.counting()));
        return ResponseEntity.ok(distribution);
    }

    // ── Subject averages for a class/exam (bar chart) ──
    @GetMapping("/subject-averages/{examId}/{classId}")
    public ResponseEntity<List<Map<String, Object>>> getSubjectAverages(
            @PathVariable Long examId,
            @PathVariable Long classId) {

        List<Object[]> results = markRepository.getSubjectAveragesByExam(examId, classId);

        List<Map<String, Object>> response = results.stream()
                .map(row -> Map.<String, Object>of(
                        "subject", row[0],
                        "average", BigDecimal.valueOf((Double) row[1])
                                .setScale(2, RoundingMode.HALF_UP)
                ))
                .sorted(Comparator.comparingDouble(
                        m -> -((BigDecimal) m.get("average")).doubleValue()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ── Full class marklist with positions ──
    @GetMapping("/marklist/{examId}")
    public ResponseEntity<List<StudentMarkSummaryDTO>> getFullMarklist(@PathVariable Long examId) {
        return ResponseEntity.ok(markService.getClassMarkList(examId));
    }

    // ── Class comparison across exams (line chart data) ──
    @GetMapping("/class-trend/{classId}")
    public ResponseEntity<List<Map<String, Object>>> getClassTrend(@PathVariable Long classId) {
        var exams = examRepository.findByClassRoom_ClassId(classId);

        List<Map<String, Object>> trend = new ArrayList<>();

        for (var exam : exams) {
            List<StudentMarkSummaryDTO> marklist = markService.getClassMarkList(exam.getExamId());

            double avg = marklist.stream()
                    .mapToDouble(s -> s.getAverage() != null ? s.getAverage() : 0)
                    .average().orElse(0);

            trend.add(Map.of(
                    "examName", exam.getExamName(),
                    "term", exam.getTerm(),
                    "classAverage", BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP),
                    "examId", exam.getExamId()
            ));
        }

        return ResponseEntity.ok(trend);
    }

    // ── Individual student full academic history ──
    @GetMapping("/student/{studentId}")
    public ResponseEntity<Map<String, Object>> getStudentHistory(@PathVariable Long studentId) {
        var marks = markRepository.findByStudent_StudentId(studentId);

        // Group by exam
        Map<String, List<Map<String, Object>>> byExam = new LinkedHashMap<>();

        marks.forEach(m -> {
            String key = m.getExam().getExamName() + " - Term " + m.getExam().getTerm()
                    + " " + m.getExam().getAcademicYear();
            byExam.computeIfAbsent(key, k -> new ArrayList<>())
                    .add(Map.of(
                            "subject", m.getSubject().getSubjectName(),
                            "score", m.getScore(),
                            "grade", m.getGrade() != null ? m.getGrade() : "N/A"
                    ));
        });

        // Average per exam for line chart
        List<Map<String, Object>> trend = byExam.entrySet().stream()
                .map(e -> {
                    double avg = e.getValue().stream()
                            .mapToDouble(s -> ((BigDecimal) s.get("score")).doubleValue())
                            .average().orElse(0);
                    return Map.<String, Object>of(
                            "exam", e.getKey(),
                            "subjects", e.getValue(),
                            "average", BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP)
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("examHistory", trend));
    }
}
