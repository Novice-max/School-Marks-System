package com.school.marks.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminMarkDTO {
    private Long subjectId;
    private String subjectName;
    private Long markId;        // null if mark doesn't exist yet
    private BigDecimal score;   // null if not entered yet
    private String grade;       // null if not entered yet
}