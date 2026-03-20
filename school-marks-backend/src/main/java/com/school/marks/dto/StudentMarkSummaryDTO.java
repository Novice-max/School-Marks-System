package com.school.marks.dto;
import lombok.*;
import java.util.List;
@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class StudentMarkSummaryDTO {
    private Long studentId;
    private String admissionNumber;
    private String fullName;
    private List<SubjectMarkDTO> subjectMarks;
    private Double totalScore;
    private Double average;
    private Integer position;
}
