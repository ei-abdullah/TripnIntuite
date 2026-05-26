package com.abdullah.api.auth;

import com.abdullah.api.auth.dto.AuthResponse;
import com.abdullah.api.auth.dto.LoginRequest;
import com.abdullah.api.auth.dto.SignupRequest;
import com.abdullah.api.auth.dto.UserDto;
import com.abdullah.api.auth.jwt.JwtService;
import com.abdullah.api.email.EmailService;
import com.abdullah.api.exception.DuplicateResourceException;
import com.abdullah.api.exception.EntityNotFoundException;
import com.abdullah.api.user.Role;
import com.abdullah.api.user.User;
import com.abdullah.api.user.UserPrincipal;
import com.abdullah.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Value("${app.base-url}")
    private String baseUrl;

    public UserDto signup(SignupRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }
        if (userRepository.findByUsername(request.username()) != null) {
            throw new DuplicateResourceException("Username already taken");
        }

        String verificationToken = UUID.randomUUID().toString();
        Instant now = Instant.now();

        User user = User.builder()
                .email(request.email())
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .roles(List.of(Role.USER))
                .verificationToken(verificationToken)
                .isVerified(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User saved = userRepository.save(user);

        String verificationUrl = baseUrl + "/api/v1/auth/signup/verify?token=" + verificationToken;
        emailService.sendVerificationEmail(saved.getEmail(), verificationUrl);
        log.info("Signup: created user id={} email={} (verification email dispatched)",
                saved.getId(), saved.getEmail());

        return UserDto.from(saved);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found after authentication"));

        String token = jwtService.generateAccessToken(user);
        log.info("Login: user id={} email={} issued token", user.getId(), user.getEmail());

        return new AuthResponse(token, UserDto.from(user));
    }

    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token);

        if (user == null) {
            throw new EntityNotFoundException("User not found with verification token: " + token);
        }

        if (Boolean.TRUE.equals(user.getIsVerified())) {
            throw new DuplicateResourceException("Email already verified");
        }

        user.setVerificationToken(null);
        user.setIsVerified(true);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        log.info("Verification: user id={} email={} verified", user.getId(), user.getEmail());
    }

    public UserDto currentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
        return UserDto.from(user);
    }
}
