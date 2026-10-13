package com.school.marks.repository;

import com.school.marks.model.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findByUser_UserIdOrderByTimestampDesc(Long userId);

    List<AuditLog> findByTableNameOrderByTimestampDesc(String tableName);

    long countByTimestampAfter(LocalDateTime after);

    long countByActionAndTimestampAfter(String action, LocalDateTime after);

    long countByCategoryAndTimestampAfter(String category, LocalDateTime after);

    List<AuditLog> findTop20ByOrderByTimestampDesc();

    // Raw timestamps since a point in time — bucketed per day (Nairobi time) in Java
    @Query("SELECT a.timestamp FROM AuditLog a WHERE a.timestamp >= :since")
    List<LocalDateTime> timestampsSince(@Param("since") LocalDateTime since);

    // Most active people since a point in time (failed logins excluded)
    @Query("SELECT a.actorUsername, a.actorRole, COUNT(a) FROM AuditLog a " +
           "WHERE a.timestamp >= :since AND a.actorUsername IS NOT NULL AND a.action <> 'LOGIN_FAILED' " +
           "GROUP BY a.actorUsername, a.actorRole ORDER BY COUNT(a) DESC")
    List<Object[]> topActorsSince(@Param("since") LocalDateTime since, Pageable pageable);

    @Query("SELECT DISTINCT a.actorUsername FROM AuditLog a WHERE a.actorUsername IS NOT NULL ORDER BY a.actorUsername")
    List<String> findDistinctActors();
}
