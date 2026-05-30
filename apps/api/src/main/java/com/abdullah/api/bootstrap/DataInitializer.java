package com.abdullah.api.bootstrap;

import com.abdullah.api.user.Role;
import com.abdullah.api.user.User;
import com.abdullah.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Initialize your data here
        initAdminUser();
    }

    @Transactional
    protected void initAdminUser() {
        User user = User
                .builder()
                .email("abdullah.zafar.career@gmail.com")
                .username("abdullah")
                .passwordHash(passwordEncoder.encode("admin"))
                .roles(List.of(Role.ADMIN, Role.USER))
                .verificationToken(null)
                .isVerified(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        userRepository.save(user);
    }
}
