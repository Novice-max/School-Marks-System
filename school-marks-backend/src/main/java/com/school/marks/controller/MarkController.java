package com.school.marks.controller;

import com.school.marks.dto.AdminMarkDTO;
import com.school.marks.dto.MarkEntryDTO;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import com.school.marks.service.MarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/marks")
@RequiredArgsConstructor
public class MarkController {

    private final MarkService markService;
    private final MarkRepository markRepository;
    private final StudentRepository studentRepository;
    private final ExamRepository examRepository;
    private final SubjectRepository subjectRepository;

    // ── Get all exams for a student's class ──
    @GetMapping("/student/{studentId}/exams")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Exam>> getExamsForStudent(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        Long classId = student.getClassRoom().getClassId();
        List<Exam> exams = examRepository.findByClassRoom_ClassId(classId);
        return ResponseEntity.ok(exams);
    }

    // ── Get subjects + current scores for a student in a specific exam ──
    @GetMapping("/student/{studentId}/exam/{examId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AdminMarkDTO>> getMarksForEdit(
            @PathVariable Long studentId,
            @PathVariable Long examId) {

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        Long classId = exam.getClassRoom().getClassId();

        // Get subjects used in this exam for the class
        List<Mark> classMarks = markRepository.findByExamIdAndClassId(examId, classId);
        Set<Long> usedSubjectIds = classMarks.stream()
                .map(m -> m.getSubject().getSubjectId())
                .collect(Collectors.toSet());

        // Fall back to all subjects if exam is fresh (no marks yet)
        List<Subject> allSubjects = subjectRepository.findAll();
        List<Subject> subjects = usedSubjectIds.isEmpty()
                ? allSubjects
                : allSubjects.stream()
                        .filter(sub -> usedSubjectIds.contains(sub.getSubjectId()))
                        .collect(Collectors.toList());

        // This student's existing marks for this exam
        List<Mark> studentMarks = markRepository
                .findByStudent_StudentIdAndExam_ExamId(studentId, examId);
        Map<Long, Mark> bySubject = studentMarks.stream()
                .collect(Collectors.toMap(m -> m.getSubject().getSubjectId(), m -> m));

        List<AdminMarkDTO> result = subjects.stream()
                .map(sub -> {
                    Mark m = bySubject.get(sub.getSubjectId());
                    return AdminMarkDTO.builder()
                            .subjectId(sub.getSubjectId())
                            .subjectName(sub.getSubjectName())
                            .markId(m != null ? m.getMarkId() : null)
                            .score(m != null ? m.getScore() : null)
                            .grade(m != null ? m.getGrade() : null)
                            .build();
                })
                .sorted(Comparator.comparing(AdminMarkDTO::getSubjectName))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── Bulk save / update marks for a student in an exam ──
    @PutMapping("/student/{studentId}/exam/{examId}")
    public ResponseEntity<?> saveMarks(
            @PathVariable Long studentId,
            @PathVariable Long examId,
            @RequestBody List<Map<String, Object>> updates,
            @AuthenticationPrincipal UserDetails ud) {

        int saved = 0;
        for (Map<String, Object> update : updates) {
            Object scoreObj = update.get("score");
            if (scoreObj == null || scoreObj.toString().isBlank()) continue;

            BigDecimal score = new BigDecimal(scoreObj.toString());
            if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(new BigDecimal("100")) > 0)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Score must be between 0 and 100"));

            Long subjectId = Long.parseLong(update.get("subjectId").toString());
            MarkEntryDTO dto = MarkEntryDTO.builder()
                    .studentId(studentId)
                    .subjectId(subjectId)
                    .examId(examId)
                    .score(score)
                    .build();
            markService.enterOrUpdateMark(dto, ud.getUsername());
            saved++;
        }
        return ResponseEntity.ok(Map.of("saved", saved, "message", saved + " mark(s) saved"));
    }
}