package com.school.marks.security;

import com.school.marks.model.User;
import com.school.marks.repository.UserRepository;
import com.school.marks.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class JwtFilter extends OncePerRequestFilter {

    /**
     * The only endpoints an account with a pending password change may call.
     * Everything else is refused until the temporary password is replaced —
     * enforced here on the server, not just by a browser redirect.
     */
    private static final Set<String> ALLOWED_BEFORE_PASSWORD_CHANGE = Set.of(
            "/api/auth/change-password",
            "/api/auth/refresh",
            "/api/auth/logout");

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String username;
        try {
            username = jwtUtil.extractUsername(jwt);
        } catch (Exception e) {
            filterChain.doFilter(request, response); // bad token → unauthenticated → 401
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Re-read from the DB on every request: a deactivated account, or one
            // whose password was just reset, loses access immediately.
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
                filterChain.doFilter(request, response);
                return;
            }

            UserDetails userDetails = AuthService.toUserDetails(user);
            if (!jwtUtil.isTokenValid(jwt, userDetails)) {
                filterChain.doFilter(request, response);
                return;
            }

            if (Boolean.TRUE.equals(user.getIsFirstLogin())
                    && !ALLOWED_BEFORE_PASSWORD_CHANGE.contains(request.getRequestURI())) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"message\":\"Please sign in and set a new password first.\",\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }

            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }
}
