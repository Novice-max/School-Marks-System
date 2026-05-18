package com.school.marks.dto;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkEntryDTO {
    @NotNull private Long studentId;
    @NotNull private Long subjectId;
    @NotNull private Long examId;
    @NotNull @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal score;
}
