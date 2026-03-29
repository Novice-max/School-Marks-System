package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "classes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long classId;

    // -1 = PP1, 0 = PP2, 1-9 = Grade 1-9
    @Column(nullable = false)
    private Integer gradeLevel;

    // 'pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary'
    @Column(nullable = false)
    private String levelType;

    @ManyToOne
    @JoinColumn(name = "class_teacher_id")
    private Teacher classTeacher;

    @Column(nullable = false)
    private String academicYear;

    public String getDisplayName() {
        if (gradeLevel == -1) return "Pre-Primary 1 (PP1)";
        if (gradeLevel == 0)  return "Pre-Primary 2 (PP2)";
        if (gradeLevel <= 6)  return "Grade " + gradeLevel;
        return "Grade " + gradeLevel + " (JSS)";
    }
}