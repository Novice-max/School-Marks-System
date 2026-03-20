package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long examId;

    // 'Opener', 'Mid-Term', 'End-Term'
    @Column(nullable = false)
    private String examName;

    // 1, 2, or 3
    @Column(nullable = false)
    private Integer term;

    @Column(nullable = false)
    private String academicYear;

    @ManyToOne
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;
}
