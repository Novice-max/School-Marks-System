package com.school.marks.controller;

import com.school.marks.security.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * TEMPORARY diagnostic — delete after the real-IP fix is confirmed.
 *
 * Echoes back only the proxy headers of the caller's OWN request (like
 * api.ipify.org does), so we can see exactly how Railway's edge writes them.
 * Exposes nothing about other users or the server.
 */
@RestController
public class IpCheckController {

    @GetMapping("/api/ip-check")
    public ResponseEntity<Map<String, String>> ipCheck(HttpServletRequest request) {
        Map<String, String> out = new LinkedHashMap<>();
        out.put("resolvedByV3", ClientIp.resolve(request));
        out.put("remoteAddr", String.valueOf(request.getRemoteAddr()));
        for (String h : new String[]{"X-Forwarded-For", "X-Real-IP", "Forwarded",
                "X-Envoy-External-Address", "CF-Connecting-IP", "True-Client-IP", "Fly-Client-IP"}) {
            out.put(h, String.valueOf(request.getHeader(h)));
        }
        return ResponseEntity.ok(out);
    }
}
