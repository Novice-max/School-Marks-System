package com.school.marks.service;

import com.school.marks.dto.*;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarkService {

    private final MarkRepository markRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final TeacherSubjectAssignmentRepository assignmentRepository;
    private final AuditLogRepository auditLogRepository;

    // ===================== GRADE CALCULATION =====================

    public String calculateCbcGrade(BigDecimal score) {
        int s = score.intValue();
        if (s >= 90) return "EE1";
        if (s >= 75) return "EE2";
        if (s >= 58) return "ME1";
        if (s >= 41) return "ME2";
        if (s >= 31) return "AE1";
        if (s >= 21) return "AE2";
        if (s >= 11) return "BE1";
        return "BE2";
    }

    public int calculateGradePoints(String grade) {
        return switch (grade) {
            case "EE1", "EE2" -> 4;
            case "ME1", "ME2" -> 3;
            case "AE1", "AE2" -> 2;
            default -> 1;
        };
    }

    // ===================== MARK ENTRY =====================

    @Transactional
    public Mark enterOrUpdateMark(MarkEntryDTO dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        Exam exam = examRepository.findById(dto.getExamId())
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        // SECURITY CHECK: Teacher can only enter marks for their assigned subject+class
        if (user.getRole() == User.Role.TEACHER) {
            boolean isAssigned = assignmentRepository
                .existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassIdAndAcademicYearAndTerm(
                    user.getTeacher().getTeacherId(),
                    dto.getSubjectId(),
                    exam.getClassRoom().getClassId(),
                    exam.getAcademicYear(),
                    exam.getTerm()
                );

            if (!isAssigned) {
                throw new AccessDeniedException("You are not assigned to teach this subject for this class");
            }
        }

        String grade = calculateCbcGrade(dto.getScore());
        int gradePoints = calculateGradePoints(grade);

        // Check if mark already exists (update scenario)
        Optional<Mark> existingMark = markRepository
            .findByStudent_StudentIdAndSubject_SubjectIdAndExam_ExamId(
                dto.getStudentId(), dto.getSubjectId(), dto.getExamId());

        Mark mark;
        String oldValue = null;

        if (existingMark.isPresent()) {
            mark = existingMark.get();
            oldValue = mark.getScore().toString();
            mark.setScore(dto.getScore());
            mark.setGrade(grade);
            mark.setGradePoints(gradePoints);
            mark.setUpdatedAt(LocalDateTime.now());
        } else {
            mark = Mark.builder()
                    .student(student)
                    .subject(subject)
                    .exam(exam)
                    .score(dto.getScore())
                    .grade(grade)
                    .gradePoints(gradePoints)
                    .enteredBy(user)
                    .build();
        }

        Mark saved = markRepository.save(mark);

        // Audit log
        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .action(oldValue == null ? "INSERT" : "UPDATE")
                .tableName("marks")
                .recordId(saved.getMarkId())
                .oldValue(oldValue)
                .newValue(dto.getScore().toString())
                .build());

        return saved;
    }

    // ===================== CLASS MARKLIST =====================

    public List<StudentMarkSummaryDTO> getClassMarkList(Long examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        List<Student> students = studentRepository
                .findByClassRoom_ClassIdAndIsActiveTrue(exam.getClassRoom().getClassId());

        List<Mark> allMarks = markRepository.findByExamIdAndClassId(examId, exam.getClassRoom().getClassId());

        // Group marks by student
        Map<Long, List<Mark>> marksByStudent = allMarks.stream()
                .collect(Collectors.groupingBy(m -> m.getStudent().getStudentId()));

        List<StudentMarkSummaryDTO> summaries = new ArrayList<>();

        for (Student student : students) {
            List<Mark> studentMarks = marksByStudent.getOrDefault(student.getStudentId(), List.of());

            List<SubjectMarkDTO> subjectMarkDTOs = studentMarks.stream()
                    .map(m -> SubjectMarkDTO.builder()
                            .subjectName(m.getSubject().getSubjectName())
                            .score(m.getScore())
                            .grade(m.getGrade())
                            .gradePoints(m.getGradePoints())
                            .build())
                    .collect(Collectors.toList());

            double total = studentMarks.stream()
                    .mapToDouble(m -> m.getScore().doubleValue())
                    .sum();

            double average = studentMarks.isEmpty() ? 0
                    : BigDecimal.valueOf(total / studentMarks.size())
                        .setScale(2, RoundingMode.HALF_UP).doubleValue();

            summaries.add(StudentMarkSummaryDTO.builder()
                    .studentId(student.getStudentId())
                    .admissionNumber(student.getAdmissionNumber())
                    .fullName(student.getFullName())
                    .subjectMarks(subjectMarkDTOs)
                    .totalScore(total)
                    .average(average)
                    .build());
        }

        // Sort by total descending and assign positions
        summaries.sort(Comparator.comparingDouble(StudentMarkSummaryDTO::getTotalScore).reversed());
        for (int i = 0; i < summaries.size(); i++) {
            summaries.get(i).setPosition(i + 1);
        }

        return summaries;
    }

    // ===================== SUBJECT AVERAGES (for teacher dashboard) =====================

    public Map<String, Object> getSubjectAnalytics(Long examId, Long subjectId) {
        List<Mark> marks = markRepository.findByExam_ExamIdAndSubject_SubjectId(examId, subjectId);

        if (marks.isEmpty()) {
            return Map.of("message", "No marks entered yet");
        }

        double average = marks.stream()
                .mapToDouble(m -> m.getScore().doubleValue())
                .average().orElse(0);

        double highest = marks.stream()
                .mapToDouble(m -> m.getScore().doubleValue())
                .max().orElse(0);

        double lowest = marks.stream()
                .mapToDouble(m -> m.getScore().doubleValue())
                .min().orElse(0);

        // Grade distribution for pie chart
        Map<String, Long> gradeDistribution = marks.stream()
                .collect(Collectors.groupingBy(Mark::getGrade, Collectors.counting()));

        // Student scores for bar chart
        List<Map<String, Object>> studentScores = marks.stream()
                .map(m -> Map.<String, Object>of(
                        "name", m.getStudent().getFullName(),
                        "score", m.getScore(),
                        "grade", m.getGrade()
                ))
                .sorted(Comparator.comparingDouble(s -> -((BigDecimal) s.get("score")).doubleValue()))
                .collect(Collectors.toList());

        return Map.of(
                "average", BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP),
                "highest", highest,
                "lowest", lowest,
                "totalStudents", marks.size(),
                "gradeDistribution", gradeDistribution,
                "studentScores", studentScores
        );
    }

    // ===================== TEACHER'S ASSIGNED SUBJECTS =====================

    public List<TeacherSubjectAssignment> getTeacherAssignments(Long teacherId) {
        return assignmentRepository.findByTeacher_TeacherId(teacherId);
    }
}
