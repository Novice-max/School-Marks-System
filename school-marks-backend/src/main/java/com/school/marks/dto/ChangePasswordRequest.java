package com.school.marks.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class ChangePasswordRequest {
    @NotBlank private String currentPassword;
    @NotBlank @Size(min=6) private String newPassword;
}
