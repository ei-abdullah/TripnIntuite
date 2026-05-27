package com.abdullah.api.user;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email"),
                @Index(name="idx_user_id", columnList = "id")
        }
)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    private String email;

    @Column(nullable = false, unique = true)
    @NotBlank(message = "Username is required")
    @Size(min = 2, max = 20, message = "Username must be greater than 2 and less than 20 characters")
    private String username;

    @Column(nullable = false)
    @NotBlank(message = "Password is required")
    private String passwordHash;

    @Builder.Default
    @NotEmpty(message = "At least one user role is required")
    @ElementCollection(targetClass = Role.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private List<Role> roles = new ArrayList<>();

    // For email-based verification
    private String verificationToken;

    @Builder.Default
    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    @Column(name = "reset_token")
    private String resetToken;

    private Instant createdAt;
    private Instant updatedAt;
}