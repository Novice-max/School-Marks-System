package com.school.marks.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Coarse per-IP flood guard on the login endpoint (30 / minute).
 * The finer per-account limit runs in AuthController, where the username is known.
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private final LoginThrottle throttle;

    public LoginRateLimitFilter(LoginThrottle throttle) {
        this.throttle = throttle;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (!"/api/auth/login".equals(request.getRequestURI()) || !"POST".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (throttle.allowIp(ClientIp.resolve(request))) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"message\":\"Too many login attempts from this network. Please wait 1 minute.\"}");
        }
    }
}
