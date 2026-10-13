package com.school.marks.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * One row per auditable event. Original columns (user, action, tableName,
 * recordId, oldValue, newValue, timestamp) are kept so existing mark-history
 * rows stay valid; the new columns make the log readable without joins.
 */
@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_actor",     columnList = "actor_username"),
        @Index(name = "idx_audit_category",  columnList = "category")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    // Null for failed logins with an unknown username
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // AUTH, MARKS, STUDENTS, TEACHERS, ADMINS, CLASSES, SUBJECTS, EXAMS, ASSIGNMENTS, REPORTS
    @Column(length = 40)
    private String category;

    // e.g. LOGIN, LOGIN_FAILED, LOGOUT, SESSION_TIMEOUT, INSERT, UPDATE, DELETE,
    // CREATE, DEACTIVATE, ACTIVATE, RESET_PASSWORD, ARCHIVE, RESTORE, DOWNLOAD
    @Column(nullable = false)
    private String action;

    // Table or area touched (kept from the original schema)
    @Column(nullable = false)
    private String tableName;

    private Long recordId;

    // Username captured at the time, so the entry survives renames/deletions
    @Column(name = "actor_username", length = 100)
    private String actorUsername;

    @Column(name = "actor_role", length = 20)
    private String actorRole;

    // Human-readable line, e.g. "Mathematics · Grade 4 · Mid-Term T2 2026 · Jane Doe (ADM 123)"
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
