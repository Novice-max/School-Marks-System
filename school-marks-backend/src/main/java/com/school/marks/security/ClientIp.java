package com.school.marks.security;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.util.regex.Pattern;

/**
 * Works out the real client IP behind Railway's proxy.
 *
 * X-Forwarded-For is a list: "whatever-the-client-claimed, ..., ip-our-proxy-saw".
 * The LEFT end is written by the client and can be faked, so it must never be
 * trusted for rate limiting. Proxies append on the RIGHT, so we read from the
 * right and take the first public address — that is the address that actually
 * connected to Railway's edge. Private / internal hops (10.x, 100.64.x, etc.)
 * are skipped so an internal proxy hop is never mistaken for the client.
 */
public final class ClientIp {

    // Only digits, hex, dots and colons — guarantees InetAddress never does a DNS lookup
    private static final Pattern IP_CHARS = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private ClientIp() {}

    public static String resolve(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] hops = xff.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String candidate = hops[i].trim();
                if (isPublic(candidate)) return candidate;
            }
        }
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
