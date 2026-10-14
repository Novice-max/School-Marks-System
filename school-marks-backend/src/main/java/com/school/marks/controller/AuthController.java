package com.school.marks.controller;

import com.school.marks.dto.*;
import com.school.marks.security.ClientIp;
import com.school.marks.security.LoginThrottle;
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
    private final LoginThrottle loginThrottle;

    /**
     * Wrong username and wrong password get the SAME answer, so nobody can use
     * this endpoint to discover which usernames exist. The audit log (superadmin
     * only) still records which one it was, so typos can be told from attacks.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        request.setUsername(username);

        // Per-account limit: 5 tries / minute for this username from this network
        if (!loginThrottle.allowAccount(ClientIp.resolve(http), username)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many attempts for this account. Please wait 1 minute."));
        }

        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (AuthenticationException e) {
            // Logged in its own transaction — login() has already rolled back
            boolean disabled = e instanceof DisabledException || e.getCause() instanceof DisabledException;
            auditService.recordFailedLogin(username,
                    disabled ? "Correct password, but the account is deactivated" : "Wrong username or password");

            if (disabled) {
                // Only reachable with the CORRECT password (checked after it in SecurityConfig),
                // so telling the person why is safe and saves a confused phone call.
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "This account has been deactivated. Please contact the school admin."));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid username or password"));
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

    /** Rule violations come back as 400 with a readable message (via GlobalExceptionHandler). */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
