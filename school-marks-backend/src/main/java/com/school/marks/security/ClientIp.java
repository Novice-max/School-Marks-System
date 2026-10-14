package com.school.marks.security;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.util.regex.Pattern;

/**
 * Works out the real client IP behind Railway's proxy.
 *
 * Verified on production (14 Oct 2026) with /api/ip-check:
 *   - Railway's edge REWRITES X-Forwarded-For to exactly "client, edge":
 *       X-Forwarded-For: 41.90.184.20, 46.151.193.242
 *     A value sent by the client ("6.6.6.6") was dropped, so the LEFT entry
 *     cannot be faked from outside.
 *   - The right-hand entries (46.151.193.241 / .242) are Railway's own edge
 *     servers, and remoteAddr (100.64.0.x) is Railway's internal network.
 *
 * So: take the first public address from the left. Fall back to X-Real-IP,
 * then the socket address, if the header is ever missing.
 */
public final class ClientIp {

    // Only digits, hex, dots and colons — guarantees InetAddress never does a DNS lookup
    private static final Pattern IP_CHARS = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private ClientIp() {}

    public static String resolve(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            for (String hop : xff.split(",")) {
                String candidate = hop.trim();
                if (isPublic(candidate)) return candidate;
            }
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && isPublic(real.trim())) return real.trim();

        String remote = request.getRemoteAddr();
        return remote == null ? "unknown" : remote;
    }

    static boolean isPublic(String ip) {
        if (ip == null || !IP_CHARS.matcher(ip).matches()) return false;
        try {
            InetAddress a = InetAddress.getByName(ip);
            if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                    || a.isSiteLocalAddress() || a.isMulticastAddress()) {
                return false;
            }
            byte[] b = a.getAddress();
            if (b.length == 4) {
                int first = b[0] & 0xFF, second = b[1] & 0xFF;
                if (first == 100 && second >= 64 && second <= 127) return false; // 100.64.0.0/10 carrier/internal
            } else if (b.length == 16) {
                if ((b[0] & 0xFE) == 0xFC) return false;                          // fc00::/7 unique-local
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
