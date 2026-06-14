package com.abdullah.api.bootstrap;

import com.abdullah.api.user.Role;
import com.abdullah.api.user.User;
import com.abdullah.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;


@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String SEED_EMAIL = "abdullah.zafar.career@gmail.com";
    private static final String SEED_USERNAME = "abdullah";
    private static final String SEED_PASSWORD = "admin4412";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(SEED_EMAIL).isPresent()) {
            log.info("Bootstrap: seed user {} already present — skipping", SEED_EMAIL);
            return;
        }

        Instant now = Instant.now();
        User user = User.builder()
                .email(SEED_EMAIL)
                .username(SEED_USERNAME)
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .roles(List.of(Role.USER))
                .verificationToken(null)
                .isVerified(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User saved = userRepository.save(user);
        log.info("Bootstrap: seeded verified user id={} email={}", saved.getId(), saved.getEmail());
    }
}