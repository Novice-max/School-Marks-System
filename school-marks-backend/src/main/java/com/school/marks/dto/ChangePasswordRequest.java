package com.school.marks.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Length and strength rules live in PasswordPolicy (server-side, readable error messages). */
@Data
public class ChangePasswordRequest {
    @NotBlank private String currentPassword;
    @NotBlank private String newPassword;
}
