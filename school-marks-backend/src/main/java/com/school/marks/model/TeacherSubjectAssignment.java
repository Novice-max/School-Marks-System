package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "teacher_subject_assignments",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"teacher_id", "subject_id", "class_id", "academic_year", "term"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherSubjectAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long assignmentId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @Column(nullable = false)
    private String academicYear;

    // 1, 2, or 3
    @Column(nullable = false)
    private Integer term;
}
