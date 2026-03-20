package com.school.marks.dto;
import lombok.*;
@Data @AllArgsConstructor @Builder
public class LoginResponse {
    private String token;
    private String role;
    private String username;
    private String fullName;
    private boolean isFirstLogin;
}
