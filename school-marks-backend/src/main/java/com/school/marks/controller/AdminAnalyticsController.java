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

    // ══════════════════════════════════════════════════════════════
    //  NEW: Subject-level trends across exams (multi-line chart)
    //  Returns per-subject averages for each exam in a class
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/subject-trend/{classId}")
    public ResponseEntity<List<Map<String, Object>>> getSubjectTrend(@PathVariable Long classId) {
        var exams = examRepository.findByClassRoom_ClassId(classId);

        List<Map<String, Object>> result = new ArrayList<>();

        for (var exam : exams) {
            List<Object[]> avgs = markRepository.getSubjectAveragesByExam(exam.getExamId(), classId);

            Map<String, Double> subjectAvgs = new LinkedHashMap<>();
            for (Object[] row : avgs) {
                subjectAvgs.put(
                        (String) row[0],
                        BigDecimal.valueOf((Double) row[1])
                                .setScale(2, RoundingMode.HALF_UP).doubleValue()
                );
            }

            Map<String, Object> examData = new LinkedHashMap<>();
            examData.put("examName", exam.getExamName());
            examData.put("term", exam.getTerm());
            examData.put("examId", exam.getExamId());
            examData.put("subjects", subjectAvgs);

            result.add(examData);
        }

        return ResponseEntity.ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    //  NEW: Student vs Class comparison for a specific exam
    //  Returns student marks + class averages side by side
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/student-comparison/{examId}/{studentId}")
    public ResponseEntity<Map<String, Object>> getStudentComparison(
            @PathVariable Long examId,
            @PathVariable Long studentId) {

        var exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        Long classId = exam.getClassRoom().getClassId();

        // Get class averages per subject
        List<Object[]> avgResults = markRepository.getSubjectAveragesByExam(examId, classId);
        Map<String, Double> classAvgs = new LinkedHashMap<>();
        for (Object[] row : avgResults) {
            classAvgs.put((String) row[0],
                    BigDecimal.valueOf((Double) row[1]).setScale(2, RoundingMode.HALF_UP).doubleValue());
        }

        // Get student marks for this exam
        List<StudentMarkSummaryDTO> marklist = markService.getClassMarkList(examId);
        var studentData = marklist.stream()
                .filter(s -> s.getStudentId().equals(studentId))
                .findFirst().orElse(null);

        Map<String, Double> studentMarks = new LinkedHashMap<>();
        Double studentAvg = null;
        Integer position = null;
        if (studentData != null) {
            studentData.getSubjectMarks().forEach(sm -> {
                if (sm.getScore() != null) {
                    studentMarks.put(sm.getSubjectName(), sm.getScore().doubleValue());
                }
            });
            studentAvg = studentData.getAverage();
            position = studentData.getPosition();
        }

        double classOverallAvg = marklist.stream()
                .mapToDouble(s -> s.getAverage() != null ? s.getAverage() : 0)
                .average().orElse(0);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("classAverages", classAvgs);
        response.put("studentMarks", studentMarks);
        response.put("studentAverage", studentAvg);
        response.put("classAverage", BigDecimal.valueOf(classOverallAvg).setScale(2, RoundingMode.HALF_UP).doubleValue());
        response.put("position", position);
        response.put("totalStudents", marklist.size());

        return ResponseEntity.ok(response);
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