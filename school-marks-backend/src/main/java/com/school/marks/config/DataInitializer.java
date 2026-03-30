package com.school.marks.config;

import com.school.marks.model.*;
import com.school.marks.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminAccount();
        seedSubjects();
    }

    // ─────────────────────────────────────────────
    // DEFAULT ADMIN  (login: admin / admin123)
    // Change password immediately after first login
    // ─────────────────────────────────────────────
    private void seedAdminAccount() {
        if (userRepository.existsByUsername("admin")) return;

        User admin = User.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode("admin123"))
                .role(User.Role.ADMIN)
                .isFirstLogin(true)
                .isActive(true)
                .build();

        userRepository.save(admin);
        log.info("✅ Default admin created — username: admin | password: admin123");
        log.warn("⚠️  Change the admin password immediately after first login!");
    }

    // ─────────────────────────────────────────────
    // CBC SUBJECTS — seeded once, matching physical report cards
    // ─────────────────────────────────────────────
    private void seedSubjects() {
        if (subjectRepository.count() > 0) return;

        List<Subject> subjects = List.of(

            // ── Pre-Primary (PP1 & PP2) ──
            Subject.builder().subjectName("Language Activities").levelType("pre_primary").build(),
            Subject.builder().subjectName("Reading").levelType("pre_primary").build(),
            Subject.builder().subjectName("Mathematical Activities").levelType("pre_primary").build(),
            Subject.builder().subjectName("Creative Activities").levelType("pre_primary").build(),
            Subject.builder().subjectName("Environmental Activities").levelType("pre_primary").build(),
            Subject.builder().subjectName("Religious Activities").levelType("pre_primary").build(),

            // ── Lower Primary (Grade 1–3) ──
            Subject.builder().subjectName("English Language").levelType("lower_primary").build(),
            Subject.builder().subjectName("Kiswahili Lugha").levelType("lower_primary").build(),
            Subject.builder().subjectName("Mathematical Activities").levelType("lower_primary").build(),
            Subject.builder().subjectName("Creative Activities").levelType("lower_primary").build(),
            Subject.builder().subjectName("Environmental Activities").levelType("lower_primary").build(),
            Subject.builder().subjectName("Religious Education").levelType("lower_primary").build(),

            // ── Upper Primary (Grade 4–6) ──
            Subject.builder().subjectName("English").levelType("upper_primary").build(),
            Subject.builder().subjectName("Kiswahili").levelType("upper_primary").build(),
            Subject.builder().subjectName("Mathematics").levelType("upper_primary").build(),
            Subject.builder().subjectName("Science and Technology").levelType("upper_primary").build(),
            Subject.builder().subjectName("Agriculture").levelType("upper_primary").build(),
            Subject.builder().subjectName("Social Studies").levelType("upper_primary").build(),
            Subject.builder().subjectName("Religious Activities").levelType("upper_primary").build(),
            Subject.builder().subjectName("Creative Arts & Sports").levelType("upper_primary").build(),
            Subject.builder().subjectName("French Language").levelType("upper_primary").build(),
            Subject.builder().subjectName("Computer Studies").levelType("upper_primary").build(),

            // ── Junior Secondary (Grade 7–9) ──
            Subject.builder().subjectName("English").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Kiswahili").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Mathematics").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Integrated Science").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Agriculture").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Social Studies").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Religious Activities").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Pre-Technical Activities").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Creative Arts & Sports").levelType("junior_secondary").build(),
            Subject.builder().subjectName("French Language").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Computer Studies").levelType("junior_secondary").build()
        );

        subjectRepository.saveAll(subjects);
        log.info("✅ CBC subjects seeded — {} subjects loaded", subjects.size());
    }
}