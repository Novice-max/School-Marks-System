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
    private final AuditService auditService;

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

        // SECURITY CHECK: Teacher can only enter marks for their assigned subject+class+term
        if (user.getRole() == User.Role.TEACHER) {
            checkTeacherMayEnter(user, subject, exam);
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

            // Bulk saves resend every row. Unchanged scores are skipped so the
            // audit log only shows real edits.
            if (mark.getScore() != null && mark.getScore().compareTo(dto.getScore()) == 0) {
                return mark;
            }

            oldValue = mark.getScore() != null ? mark.getScore().stripTrailingZeros().toPlainString() : null;
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

        // Audit log — readable without joins
        String description = subject.getSubjectName()
                + " · " + exam.getClassRoom().getDisplayName()
                + " · " + exam.getExamName() + " T" + exam.getTerm() + " " + exam.getAcademicYear()
                + " · " + student.getFullName() + " (" + student.getAdmissionNumber() + ")";

        auditService.record(
                AuditService.MARKS,
                existingMark.isPresent() ? "UPDATE" : "INSERT",
                "marks",
                saved.getMarkId(),
                description,
                oldValue,
                dto.getScore().stripTrailingZeros().toPlainString());

        return saved;
    }

    // ===================== BULK MARK ENTRY =====================

    /** What a bulk save did — returned to the browser. */
    public record BulkSaveResult(int saved, int unchanged, int skippedEmpty) {}

    /**
     * Saves one class's marks for ONE subject and ONE exam, all-or-nothing.
     *
     * Before: the controller called enterOrUpdateMark once per student — about
     * 9 queries and a separate commit per row (~270 queries for 30 students),
     * and a failure halfway left the class half-saved.
     * Now: one transaction; user, subject, exam, permission, students and
     * existing marks are each loaded once; marks and audit rows are written
     * together. If anything fails, nothing is saved.
     */
    @Transactional
    public BulkSaveResult enterMarksBulk(List<MarkEntryDTO> dtos, String username) {
        if (dtos == null || dtos.isEmpty()) return new BulkSaveResult(0, 0, 0);

        Long examId    = dtos.get(0).getExamId();
        Long subjectId = dtos.get(0).getSubjectId();
        for (MarkEntryDTO d : dtos) {
            if (d.getStudentId() == null
                    || !Objects.equals(d.getExamId(), examId)
                    || !Objects.equals(d.getSubjectId(), subjectId)) {
                throw new IllegalArgumentException("A bulk save must be for one subject and one exam.");
            }
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new NoSuchElementException("Subject not found"));
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new NoSuchElementException("Exam not found"));
        Long classId = exam.getClassRoom().getClassId();

        // One permission check for the whole batch (it's always one subject + one exam)
        if (user.getRole() == User.Role.TEACHER) {
            checkTeacherMayEnter(user, subject, exam);
        }

        // Last entry wins if the same student appears twice
        Map<Long, MarkEntryDTO> byStudent = new LinkedHashMap<>();
        for (MarkEntryDTO d : dtos) byStudent.put(d.getStudentId(), d);

        // All students in one query; each must belong to this exam's class
        Map<Long, Student> students = studentRepository.findAllById(byStudent.keySet()).stream()
                .collect(Collectors.toMap(Student::getStudentId, st -> st));
        for (Long id : byStudent.keySet()) {
            Student st = students.get(id);
            if (st == null) throw new NoSuchElementException("Student not found: " + id);
            if (st.getClassRoom() == null || !classId.equals(st.getClassRoom().getClassId())) {
                throw new IllegalArgumentException(st.getFullName() + " is not in this exam's class.");
            }
        }

        // All existing marks for this subject + exam in one query
        Map<Long, Mark> existing = markRepository.findByExam_ExamIdAndSubject_SubjectId(examId, subjectId).stream()
                .collect(Collectors.toMap(m -> m.getStudent().getStudentId(), m -> m, (a, b) -> a));

        record Change(Mark mark, boolean isNew, String oldValue, Student student) {}
        List<Change> changes = new ArrayList<>();
        int unchanged = 0, skippedEmpty = 0;
        LocalDateTime now = LocalDateTime.now();

        for (MarkEntryDTO d : byStudent.values()) {
            if (d.getScore() == null) { skippedEmpty++; continue; }
            Student st = students.get(d.getStudentId());
            String grade = calculateCbcGrade(d.getScore());
            int points = calculateGradePoints(grade);
            Mark mark = existing.get(d.getStudentId());

            if (mark != null) {
                // The page only sends changed rows, but never write (or log) a non-change
                if (mark.getScore() != null && mark.getScore().compareTo(d.getScore()) == 0) { unchanged++; continue; }
                String old = mark.getScore() != null ? mark.getScore().stripTrailingZeros().toPlainString() : null;
                mark.setScore(d.getScore());
                mark.setGrade(grade);
                mark.setGradePoints(points);
                mark.setUpdatedAt(now);
                changes.add(new Change(mark, false, old, st));
            } else {
                Mark created = Mark.builder()
                        .student(st).subject(subject).exam(exam)
                        .score(d.getScore()).grade(grade).gradePoints(points)
                        .enteredBy(user)
                        .build();
                changes.add(new Change(created, true, null, st));
            }
        }

        if (changes.isEmpty()) return new BulkSaveResult(0, unchanged, skippedEmpty);

        markRepository.saveAll(changes.stream().map(Change::mark).toList());

        String context = subject.getSubjectName()
                + " · " + exam.getClassRoom().getDisplayName()
                + " · " + exam.getExamName() + " T" + exam.getTerm() + " " + exam.getAcademicYear();
        List<AuditService.Item> items = new ArrayList<>(changes.size());
        for (Change c : changes) {
            items.add(new AuditService.Item(
                    c.isNew() ? "INSERT" : "UPDATE",
                    c.mark().getMarkId(),
                    context + " · " + c.student().getFullName() + " (" + c.student().getAdmissionNumber() + ")",
                    c.oldValue(),
                    c.mark().getScore().stripTrailingZeros().toPlainString()));
        }
        auditService.recordAll(AuditService.MARKS, "marks", items);

        return new BulkSaveResult(changes.size(), unchanged, skippedEmpty);
    }

    /**
     * Teachers may only enter marks for an active subject they are assigned to,
     * in that class, for the exam's academic year and term. A refusal is written
     * to the audit log (in its own transaction, so it survives the rollback)
     * before the request is rejected.
     */
    private void checkTeacherMayEnter(User user, Subject subject, Exam exam) {
        String where = subject.getSubjectName()
                + " · " + exam.getClassRoom().getDisplayName()
                + " · " + exam.getExamName() + " T" + exam.getTerm() + " " + exam.getAcademicYear();

        if (!subject.isActiveSubject()) {
            auditService.recordDenied(AuditService.MARKS, "MARK_DENIED", "marks", null,
                    where + " — refused: subject is archived");
            throw new AccessDeniedException("This subject has been archived and no longer accepts marks");
        }

        boolean assigned = user.getTeacher() != null && assignmentRepository
                .existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassIdAndAcademicYearAndTerm(
                        user.getTeacher().getTeacherId(),
                        subject.getSubjectId(),
                        exam.getClassRoom().getClassId(),
                        exam.getAcademicYear(),
                        exam.getTerm());

        if (!assigned) {
            auditService.recordDenied(AuditService.MARKS, "MARK_DENIED", "marks", null,
                    where + " — refused: not assigned to this subject and class for Term " + exam.getTerm()
                            + " " + exam.getAcademicYear());
            throw new AccessDeniedException("You are not assigned to " + subject.getSubjectName()
                    + " for " + exam.getClassRoom().getDisplayName() + " in Term " + exam.getTerm()
                    + " " + exam.getAcademicYear() + ". Ask the admin to assign you.");
        }
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
