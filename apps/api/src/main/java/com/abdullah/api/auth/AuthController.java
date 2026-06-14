package com.abdullah.api.auth;

import com.abdullah.api.auth.dto.AuthResponse;
import com.abdullah.api.auth.dto.LoginRequest;
import com.abdullah.api.auth.dto.SignupRequest;
import com.abdullah.api.auth.dto.UserDto;
import com.abdullah.api.email.HtmlPageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final HtmlPageService htmlPageService;

    @PostMapping("/signup")
    public ResponseEntity<UserDto> signup(@Valid @RequestBody SignupRequest request) {
        UserDto created = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(authService.currentUser(principal.getUsername()));
    }

    @GetMapping("/signup/verify")
    public ResponseEntity<String> verifyEmailLanding(
            @RequestParam("token") @NotBlank String token
    ) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .header("Content-Type", "text/html")
                .body(htmlPageService.getVerificationLandingPage(token));
    }

    @PostMapping("/signup/verify")
    public ResponseEntity<String> verifyEmail(
            @RequestParam("token") @NotBlank String token
    ) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .header("Content-Type", "text/html")
                    .body(htmlPageService.getVerificationSuccessPage());
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .header("Content-Type", "text/html")
                    .body(htmlPageService.getVerificationErrorPage(e.getMessage()));
        }
    }
}
