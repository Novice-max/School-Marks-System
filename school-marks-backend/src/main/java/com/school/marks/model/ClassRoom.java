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

    // 1-9 (Grade 1 to Grade 9)
    @Column(nullable = false)
    private Integer gradeLevel;

    // 'Primary' or 'Junior Secondary'
    @Column(nullable = false)
    private String levelType;

    @ManyToOne
    @JoinColumn(name = "class_teacher_id")
    private Teacher classTeacher;

    @Column(nullable = false)
    private String academicYear;

    public String getDisplayName() {
        if (gradeLevel <= 6) {
            return "Grade " + gradeLevel;
        } else {
            return "Grade " + gradeLevel + " (JSS)";
        }
    }
}
