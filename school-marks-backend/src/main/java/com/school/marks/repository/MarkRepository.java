package com.school.marks.repository;

import com.school.marks.model.Mark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MarkRepository extends JpaRepository<Mark, Long> {

    Optional<Mark> findByStudent_StudentIdAndSubject_SubjectIdAndExam_ExamId(
        Long studentId, Long subjectId, Long examId);

    List<Mark> findByExam_ExamIdAndSubject_SubjectId(Long examId, Long subjectId);

    List<Mark> findByStudent_StudentId(Long studentId);

    @Query("SELECT m FROM Mark m WHERE m.exam.examId = :examId AND m.student.classRoom.classId = :classId")
    List<Mark> findByExamIdAndClassId(@Param("examId") Long examId, @Param("classId") Long classId);

    @Query("SELECT m.subject.subjectName, AVG(m.score) FROM Mark m " +
           "WHERE m.exam.examId = :examId AND m.student.classRoom.classId = :classId " +
           "GROUP BY m.subject.subjectName")
    List<Object[]> getSubjectAveragesByExam(@Param("examId") Long examId, @Param("classId") Long classId);
    List<Mark> findByStudent_StudentIdAndExam_ExamId(Long studentId, Long examId);
}
