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
    // CBC SUBJECTS — seeded once
    // ─────────────────────────────────────────────
    private void seedSubjects() {
        if (subjectRepository.count() > 0) return;

        List<Subject> subjects = List.of(
            // Lower Primary (Grade 1–3)
            Subject.builder().subjectName("English").levelType("lower_primary").build(),
            Subject.builder().subjectName("Kiswahili").levelType("lower_primary").build(),
            Subject.builder().subjectName("Mathematics").levelType("lower_primary").build(),
            Subject.builder().subjectName("Environmental Activities").levelType("lower_primary").build(),
            Subject.builder().subjectName("Creative Arts").levelType("lower_primary").build(),
            Subject.builder().subjectName("Physical & Health Education").levelType("lower_primary").build(),
            Subject.builder().subjectName("Religious Education").levelType("lower_primary").build(),

            // Upper Primary (Grade 4–6)
            Subject.builder().subjectName("English").levelType("upper_primary").build(),
            Subject.builder().subjectName("Kiswahili").levelType("upper_primary").build(),
            Subject.builder().subjectName("Mathematics").levelType("upper_primary").build(),
            Subject.builder().subjectName("Science & Technology").levelType("upper_primary").build(),
            Subject.builder().subjectName("Social Studies").levelType("upper_primary").build(),
            Subject.builder().subjectName("Creative Arts").levelType("upper_primary").build(),
            Subject.builder().subjectName("Physical & Health Education").levelType("upper_primary").build(),
            Subject.builder().subjectName("Religious Education").levelType("upper_primary").build(),

            // Junior Secondary (Grade 7–9)
            Subject.builder().subjectName("English").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Kiswahili").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Mathematics").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Integrated Science").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Social Studies").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Religious Education").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Business Studies").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Agriculture").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Life Skills").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Creative Arts & Sports").levelType("junior_secondary").build(),
            Subject.builder().subjectName("Pre-Technical Studies").levelType("junior_secondary").build()
        );

        subjectRepository.saveAll(subjects);
        log.info("✅ CBC subjects seeded — {} subjects loaded", subjects.size());
    }
}
