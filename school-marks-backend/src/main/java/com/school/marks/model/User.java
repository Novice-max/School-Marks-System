package com.school.marks.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(unique = true, nullable = false)
    private String username;

    // Never serialise the hash. Mark.enteredBy embeds a User, so without this
    // every marks response leaked the BCrypt hash of whoever entered the mark.
    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @OneToOne
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    // Display name for ADMIN / SUPERADMIN accounts (teachers use Teacher.fullName)
    private String fullName;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isFirstLogin = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    private LocalDateTime lastLogin;

    /** Name shown in the UI and the audit log. */
    public String getDisplayName() {
        if (teacher != null) return teacher.getFullName();
        if (fullName != null && !fullName.isBlank()) return fullName;
        return role == Role.SUPERADMIN ? "Super Admin" : "Administrator";
    }

    public enum Role {
        SUPERADMIN, ADMIN, TEACHER
    }
}
