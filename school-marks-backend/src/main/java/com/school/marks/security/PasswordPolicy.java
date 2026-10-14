package com.school.marks.security;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Server-side password rules. The browser checks the same rules for quick
 * feedback, but only these are binding — anything that talks to the API
 * directly can skip the browser.
 *
 * "Not the same as the current password" needs the stored hash, so it lives in
 * AuthService.changePassword, next to the call to this class.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    /** BCrypt silently ignores everything after 72 bytes, so longer is rejected rather than truncated. */
    public static final int MAX_BYTES = 72;

    /** Usernames: letters, digits, dot, dash, underscore. No spaces — they caused failed logins. */
    public static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9._-]{3,30}$");

    private static final Set<String> TOO_COMMON = Set.of(
            "password", "password1", "password123", "12345678", "123456789", "1234567890",
            "qwerty123", "qwertyuiop", "11111111", "00000000", "abcd1234", "iloveyou",
            "santaana", "santaana1", "santaana123", "school123", "teacher1", "teacher123",
            "admin123", "welcome1", "welcome123", "kenya123", "nairobi123");

    private PasswordPolicy() {}

    /** Throws IllegalArgumentException with a message safe to show the user. */
    public static void validateNew(String password, String username) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("Password must be at least " + MIN_LENGTH + " characters.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new IllegalArgumentException("Password is too long (maximum 72 characters).");
        }
        if (password.isBlank() || !password.equals(password.strip())) {
            throw new IllegalArgumentException("Password cannot start or end with a space.");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (username != null && username.length() >= 3
                && lower.contains(username.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Password must not contain your username.");
        }
        if (TOO_COMMON.contains(lower)) {
            throw new IllegalArgumentException("That password is too common. Choose another.");
        }
        if (lower.chars().distinct().count() < 4) {
            throw new IllegalArgumentException("Password needs more variety — use at least 4 different characters.");
        }
    }

    /** Normalises and checks a username for a new account. */
    public static String validUsername(String raw) {
        String u = raw == null ? "" : raw.trim();
        if (!USERNAME.matcher(u).matches()) {
            throw new IllegalArgumentException(
                    "Username must be 3–30 characters: letters, numbers, dot, dash or underscore, no spaces.");
        }
        return u;
    }
}
