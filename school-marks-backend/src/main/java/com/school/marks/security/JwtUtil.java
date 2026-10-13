package com.school.marks.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Short-lived, sliding JWTs.
 *
 * - A token lives for jwt.idle-minutes (default 16). The frontend logs the user out
 *   after 15 idle minutes and refreshes the token at most once a minute while the
 *   user is active, so an idle session always dies on the server too.
 * - The "sst" (session start) claim survives refreshes. Once a session is older than
 *   jwt.max-session-hours (default 12), refresh is refused and the user must log in
 *   again, even if they never went idle.
 */
@Component
public class JwtUtil {

    private static final String SESSION_START = "sst";

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.idle-minutes:16}")
    private long idleMinutes;

    @Value("${jwt.max-session-hours:12}")
    private long maxSessionHours;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /** New session (login). */
    public String generateToken(UserDetails userDetails, String role) {
        return buildToken(userDetails.getUsername(), role, System.currentTimeMillis());
    }

    /**
     * Refresh an existing, still-valid token. Keeps the original session start.
     * Returns null if the session has passed its absolute lifetime.
     */
    public String refreshToken(String token, String role) {
        Claims claims = extractAllClaims(token); // throws if expired / tampered
        Long sessionStart = claims.get(SESSION_START, Long.class);
        long start = sessionStart != null ? sessionStart : claims.getIssuedAt().getTime();
        if (System.currentTimeMillis() - start > maxSessionHours * 3_600_000L) return null;
        return buildToken(claims.getSubject(), role, start);
    }

    public long getIdleMillis() {
        return idleMinutes * 60_000L;
    }

    private String buildToken(String username, String role, long sessionStart) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", role);
        extraClaims.put(SESSION_START, sessionStart);
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(extraClaims)
                .subject(username)
                .issuedAt(new Date(now))
                .expiration(new Date(now + getIdleMillis()))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
