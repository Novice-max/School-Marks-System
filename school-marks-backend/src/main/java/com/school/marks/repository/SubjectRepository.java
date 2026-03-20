package com.school.marks.repository;

import com.school.marks.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByLevelType(String levelType);
}
