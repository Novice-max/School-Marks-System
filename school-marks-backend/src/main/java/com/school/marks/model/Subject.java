package com.school.marks.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    // 'pre_primary', 'lower_primary' (1-3), 'upper_primary' (4-6), 'junior_secondary' (7-9)
    @Column(nullable = false)
    private String levelType;

    // Archived subjects are hidden from mark entry and assignments, but their
    // historical marks and report cards stay intact. Subjects are never hard-deleted.
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** Null-safe: treats a missing value as active. */
    @JsonIgnore
    public boolean isActiveSubject() {
        return !Boolean.FALSE.equals(isActive);
    }
}
