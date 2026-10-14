package com.school.marks.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Two layers of login rate limiting:
 *
 *  1. Per IP — 30 attempts / minute. The whole staff room shares one school
 *     IP, so this has to be generous; it only stops floods from one machine.
 *  2. Per IP + username — 5 attempts / minute. Stops password guessing on one
 *     account. Keyed on the IP too, so an attacker elsewhere can't lock a
 *     teacher out of her own account by spamming wrong passwords.
 *
 * Buckets idle for 15 minutes are cleaned up so the maps can't grow forever.
 */
@Component
public class LoginThrottle {

    private static final int  PER_IP_PER_MIN      = 30;
    private static final int  PER_ACCOUNT_PER_MIN = 5;
    private static final long IDLE_MS             = Duration.ofMinutes(15).toMillis();
    private static final int  CLEANUP_EVERY       = 200;

    private record Entry(Bucket bucket, long[] lastUsed) {}

    private final Map<String, Entry> perIp      = new ConcurrentHashMap<>();
    private final Map<String, Entry> perAccount = new ConcurrentHashMap<>();
    private final AtomicInteger calls = new AtomicInteger();

    public boolean allowIp(String ip) {
        return take(perIp, ip, PER_IP_PER_MIN);
    }

    public boolean allowAccount(String ip, String username) {
        String key = ip + "|" + (username == null ? "" : username.trim().toLowerCase(Locale.ROOT));
        return take(perAccount, key, PER_ACCOUNT_PER_MIN);
    }

    private boolean take(Map<String, Entry> map, String key, int perMinute) {
        maybeCleanup();
        long now = System.currentTimeMillis();
        Entry e = map.computeIfAbsent(key, k -> new Entry(newBucket(perMinute), new long[]{now}));
        e.lastUsed()[0] = now;
        return e.bucket().tryConsume(1);
    }

    private static Bucket newBucket(int perMinute) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(perMinute, Refill.intervally(perMinute, Duration.ofMinutes(1))))
                .build();
    }

    private void maybeCleanup() {
        if (calls.incrementAndGet() % CLEANUP_EVERY != 0) return;
        long cutoff = System.currentTimeMillis() - IDLE_MS;
        perIp.entrySet().removeIf(en -> en.getValue().lastUsed()[0] < cutoff);
        perAccount.entrySet().removeIf(en -> en.getValue().lastUsed()[0] < cutoff);
    }
}
