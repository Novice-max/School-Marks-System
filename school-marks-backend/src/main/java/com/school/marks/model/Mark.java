package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "marks",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"student_id", "subject_id", "exam_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long markId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(optional = false)
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @Column(precision = 5, scale = 2)
    private BigDecimal score;

    // Auto-calculated: EE, ME, AE, BE
    private String grade;

    // Auto-calculated: 4, 3, 2, 1
    private Integer gradePoints;

    @ManyToOne
    @JoinColumn(name = "entered_by")
    private User enteredBy;

    @Builder.Default
    private LocalDateTime enteredAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
