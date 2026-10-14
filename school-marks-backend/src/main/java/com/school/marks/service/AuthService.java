package com.school.marks.service;

import com.school.marks.dto.*;
import com.school.marks.model.User;
import com.school.marks.repository.UserRepository;
import com.school.marks.security.JwtUtil;
import com.school.marks.security.PasswordPolicy;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       @Lazy AuthenticationManager authenticationManager,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.auditService = auditService;
    }

    /**
     * Used by Spring Security during login. A deactivated account is returned
     * with enabled=false instead of throwing here — SecurityConfig checks
     * "enabled" only AFTER the password is verified, so a stranger typing a
     * deactivated username can't tell it apart from any other wrong login.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return toUserDetails(user);
    }

    /** One place that turns our User into Spring's UserDetails (login + JwtFilter). */
    public static UserDetails toUserDetails(User user) {
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                Boolean.TRUE.equals(user.getIsActive()), // enabled
                true, true, true,                        // not expired / credentials ok / not locked
                List.of(new SimpleGrantedAuthority(user.getRole().name()))
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.getPassword())
        );

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(toUserDetails(user), user.getRole().name());

        auditService.recordFor(user, AuditService.AUTH, "LOGIN", "Signed in");

        return LoginResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .username(user.getUsername())
                .fullName(user.getDisplayName())
                .isFirstLogin(Boolean.TRUE.equals(user.getIsFirstLogin()))
                .build();
    }

    /**
     * Issue a fresh token for an active user. Returns null when the session has
     * hit its absolute lifetime (forces a real login).
     */
    @Transactional(readOnly = true)
    public String refresh(String username, String currentToken) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new DisabledException("Account is deactivated");
        return jwtUtil.refreshToken(currentToken, user.getRole().name());
    }

    /**
     * All rules are enforced here, whatever the browser did:
     * current password must be right, new one must pass PasswordPolicy and
     * must differ from the current one (so a temp password can't be "kept").
     */
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        String newPassword = request.getNewPassword();
        PasswordPolicy.validateNew(newPassword, user.getUsername());

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from your current one.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsFirstLogin(false);
        userRepository.save(user);

        auditService.recordFor(user, AuditService.AUTH, "PASSWORD_CHANGE", "Changed own password");
    }

    /**
     * Creates the login for a new teacher. The caller generates the one-time
     * temporary password (TempPasswords) and shows it to the admin once.
     */
    @Transactional
    public User createTeacherUser(String rawUsername, com.school.marks.model.Teacher teacher, String tempPassword) {
        String username = PasswordPolicy.validUsername(rawUsername);
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role(User.Role.TEACHER)
                .teacher(teacher)
                .isFirstLogin(true)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }
}
