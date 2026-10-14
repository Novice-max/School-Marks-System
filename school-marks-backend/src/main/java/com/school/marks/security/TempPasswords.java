package com.school.marks.security;

import java.security.SecureRandom;

/**
 * One-time temporary passwords for new and reset teacher accounts.
 *
 * Replaces the old "username + 123" pattern, which anyone who knew a teacher's
 * name could guess. Format: xxxx-xxxx, lowercase letters and digits only, with
 * look-alike characters removed (0/o, 1/l/i) so it can be read out loud or
 * typed on a phone without mistakes. It only has to survive until the teacher's
 * first login, and login attempts are rate limited.
 */
public final class TempPasswords {

    private static final String CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private TempPasswords() {}

    public static String generate() {
        StringBuilder sb = new StringBuilder(9);
        for (int i = 0; i < 8; i++) {
            if (i == 4) sb.append('-');
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
