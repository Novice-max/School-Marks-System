package com.school.marks.repository;

import com.school.marks.model.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    List<Exam> findByClassRoom_ClassIdAndAcademicYear(Long classId, String academicYear);
    List<Exam> findByClassRoom_ClassIdAndTermAndAcademicYear(Long classId, Integer term, String academicYear);
    List<Exam> findByClassRoom_ClassId(Long classId);
    List<Exam> findByClassRoom_ClassIdOrderByExamIdDesc(Long classId);

    // ── School-wide exam management ──

    // All exams matching name/term/year across all classes
    List<Exam> findByExamNameAndTermAndAcademicYear(String examName, Integer term, String academicYear);

    // Check if a school-wide exam set already exists
    boolean existsByExamNameAndTermAndAcademicYear(String examName, Integer term, String academicYear);

    // All exams for a given academic year (for grouping display)
    List<Exam> findByAcademicYear(String academicYear);

    // All exams ordered for display
    List<Exam> findAllByOrderByAcademicYearDescTermAscExamNameAsc();
}