package com.school.marks.config;

import com.school.marks.security.JwtFilter;
import com.school.marks.security.LoginRateLimitFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.Customizer;

/**
 * Role hierarchy (enforced explicitly, rule by rule):
 *   SUPERADMIN ⊃ ADMIN ⊃ (teacher endpoints, for admin tooling)
 *
 *   /api/superadmin/**  SUPERADMIN only
 *   /api/admin/**       ADMIN, SUPERADMIN
 *   /api/reports/**     ADMIN, SUPERADMIN   (teachers can no longer download reports)
 *   /api/teacher/**     TEACHER, ADMIN, SUPERADMIN — teacher reads are additionally
 *                       ownership-checked in TeacherController
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String SUPERADMIN = "SUPERADMIN";
    private static final String ADMIN      = "ADMIN";
    private static final String TEACHER    = "TEACHER";

    private final JwtFilter jwtFilter;
    private final UserDetailsService userDetailsService;
    private final LoginRateLimitFilter loginRateLimitFilter;

    public SecurityConfig(@Lazy JwtFilter jwtFilter,
                          @Lazy UserDetailsService userDetailsService,
                          LoginRateLimitFilter loginRateLimitFilter) {
        this.jwtFilter            = jwtFilter;
        this.userDetailsService   = userDetailsService;
        this.loginRateLimitFilter = loginRateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/actuator/health").permitAll()
                .requestMatchers("/api/ip-check").permitAll() // TEMPORARY diagnostic — remove with IpCheckController
                .requestMatchers("/api/superadmin/**").hasAuthority(SUPERADMIN)
                .requestMatchers("/api/admin/**").hasAnyAuthority(ADMIN, SUPERADMIN)
                .requestMatchers("/api/reports/**").hasAnyAuthority(ADMIN, SUPERADMIN)
                .requestMatchers("/api/teacher/**").hasAnyAuthority(TEACHER, ADMIN, SUPERADMIN)
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                // No / expired / invalid token → 401 so the frontend logs the user out.
                // (Without this Spring answers 403, which the frontend treats as "no permission".)
                .authenticationEntryPoint((req, res, e) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"message\":\"Session expired. Please log in again.\"}");
                })
                // Valid token, wrong role → 403
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"message\":\"You do not have permission to do that.\"}");
                })
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            // Rate limit runs BEFORE JWT check
            .addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        // Spring normally checks "account deactivated" BEFORE the password, which
        // tells a stranger the username exists. Check it AFTER instead: a wrong
        // password always gets the same generic answer; only someone who knows
        // the right password learns the account is deactivated.
        provider.setPreAuthenticationChecks(user -> { });
        provider.setPostAuthenticationChecks(user -> {
            if (!user.isEnabled()) throw new DisabledException("Account is deactivated");
        });
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
