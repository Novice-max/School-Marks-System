package com.school.marks.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.school.marks.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByClassRoom_ClassIdAndIsActiveTrue(Long classId);
    List<Student> findByClassRoom_ClassId(Long classId);
    Optional<Student> findByAdmissionNumber(String admissionNumber);
    boolean existsByAdmissionNumber(String admissionNumber);
    @Query("SELECT s FROM Student s WHERE " +
       "LOWER(s.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
       "LOWER(s.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
       "LOWER(s.admissionNumber) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Student> searchByNameOrAdmission(@Param("q") String query);
}
