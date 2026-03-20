package com.school.marks.repository;

import com.school.marks.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByClassRoom_ClassIdAndIsActiveTrue(Long classId);
    Optional<Student> findByAdmissionNumber(String admissionNumber);
    boolean existsByAdmissionNumber(String admissionNumber);
}
