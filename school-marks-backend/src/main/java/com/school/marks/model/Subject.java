package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subjects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long subjectId;

    @Column(nullable = false)
    private String subjectName;

    // 'lower_primary' (1-3), 'upper_primary' (4-6), 'junior_secondary' (7-9)
    @Column(nullable = false)
    private String levelType;
}
