package com.school.marks.repository;

import com.school.marks.model.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByClassRoom_ClassIdAndAcademicYear(Long classId, String academicYear);
    List<Exam> findByClassRoom_ClassIdAndTermAndAcademicYear(Long classId, Integer term, String academicYear);
    // Used by analytics trend endpoint
    List<Exam> findByClassRoom_ClassId(Long classId);
}
