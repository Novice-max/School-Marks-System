package com.school.marks.repository;

import com.school.marks.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    // All subjects for a level, archived included (report cards need history)
    List<Subject> findByLevelType(String levelType);

    // Active only — mark entry, assignments
    @Query("SELECT s FROM Subject s WHERE s.levelType = :lt AND (s.isActive IS NULL OR s.isActive = true)")
    List<Subject> findActiveByLevelType(@Param("lt") String levelType);

    @Query("SELECT s FROM Subject s WHERE s.isActive IS NULL OR s.isActive = true")
    List<Subject> findAllActive();

}
