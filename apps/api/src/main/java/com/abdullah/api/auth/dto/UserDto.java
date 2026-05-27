package com.abdullah.api.auth.dto;

import com.abdullah.api.user.Role;
import com.abdullah.api.user.User;

import java.util.List;

public record UserDto(
        Long id,
        String email,
        String username,
        List<Role> roles,
        boolean verified
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRoles(),
                Boolean.TRUE.equals(user.getIsVerified())
        );
    }
}
