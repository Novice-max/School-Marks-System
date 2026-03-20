package com.school.marks.repository;

import com.school.marks.model.ClassRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long> {
    List<ClassRoom> findByAcademicYear(String academicYear);
    List<ClassRoom> findByGradeLevelAndAcademicYear(Integer gradeLevel, String academicYear);
}
