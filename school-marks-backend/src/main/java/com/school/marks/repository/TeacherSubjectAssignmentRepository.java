package com.school.marks.repository;

import com.school.marks.model.TeacherSubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeacherSubjectAssignmentRepository extends JpaRepository<TeacherSubjectAssignment, Long> {

    List<TeacherSubjectAssignment> findByTeacher_TeacherIdAndAcademicYearAndTerm(
        Long teacherId, String academicYear, Integer term);

    List<TeacherSubjectAssignment> findByTeacher_TeacherId(Long teacherId);

    boolean existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassIdAndAcademicYearAndTerm(
        Long teacherId, Long subjectId, Long classId, String academicYear, Integer term);

    boolean existsByTeacher_TeacherIdAndSubject_SubjectIdAndClassRoom_ClassId(
        Long teacherId, Long subjectId, Long classId);
}