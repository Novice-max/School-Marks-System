package com.school.marks.controller;

import com.school.marks.dto.*;
import com.school.marks.service.AuditService;
import com.school.marks.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (AuthenticationException e) {
            // Logged in its own transaction — login() has already rolled back
            // DaoAuthenticationProvider wraps DisabledException from loadUserByUsername
            boolean disabled = e instanceof DisabledException || e.getCause() instanceof DisabledException;
            String reason = disabled ? "Attempt on a deactivated account" : "Wrong username or password";
            auditService.recordFailedLogin(request.getUsername(), reason);
            throw e;
        }
    }

    /**
     * Sliding session. The frontend calls this at most once a minute while the
     * user is active; an idle user stops calling it and the token dies.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@AuthenticationPrincipal UserDetails ud, HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
        String fresh = token == null ? null : authService.refresh(ud.getUsername(), token);
        if (fresh == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Session limit reached. Please log in again."));
        }
        return ResponseEntity.ok(Map.of("token", fresh));
    }

    /** reason: "manual" (Sign Out button) or "timeout" (inactivity). Best effort. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.getOrDefault("reason", "manual") : "manual";
        boolean timeout = "timeout".equalsIgnoreCase(reason);
        auditService.record(AuditService.AUTH, timeout ? "SESSION_TIMEOUT" : "LOGOUT", "users", null,
                timeout ? "Signed out after 15 minutes of inactivity" : "Signed out");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok("Password changed successfully");
    }
}
