package com.school.marks.repository;

import com.school.marks.model.TeacherSubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface TeacherSubjectAssignmentRepository extends JpaRepository<TeacherSubjectAssignment, Long> {

    List<TeacherSubjectAssignment> findByTeacher_TeacherIdAndAcademicYearAndTerm(
        Long teacherId, String academicYear, Integer term);

    List<TeacherSubjectAssignment> findByTeacher_TeacherId(Long teacherId);

    boolean existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassIdAndAcademicYearAndTerm(
        Long teacherId, Long subjectId, Long classId, String academicYear, Integer term);

    boolean existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassId(
        Long teacherId, Long subjectId, Long classId);

    // Ownership check: does this teacher teach anything in this class?
    boolean existsByTeacher_TeacherIdAndClassRoom_ClassId(Long teacherId, Long classId);

    long countBySubject_SubjectId(Long subjectId);

    // ── Copy-forward between terms ──
    List<TeacherSubjectAssignment> findByAcademicYearAndTerm(String academicYear, Integer term);

    /** Each (year, term) that has assignments, newest first: [academicYear, term, count]. */
    @Query("SELECT a.academicYear, a.term, COUNT(a) FROM TeacherSubjectAssignment a " +
           "GROUP BY a.academicYear, a.term ORDER BY a.academicYear DESC, a.term DESC")
    List<Object[]> termSummary();
}