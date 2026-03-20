package com.school.marks.dto;
import lombok.*;
import java.math.BigDecimal;
@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class SubjectMarkDTO {
    private String subjectName;
    private BigDecimal score;
    private String grade;
    private Integer gradePoints;
}
