package com.school.marks.repository;

import com.school.marks.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUser_UserIdOrderByTimestampDesc(Long userId);
    List<AuditLog> findByTableNameOrderByTimestampDesc(String tableName);
}
