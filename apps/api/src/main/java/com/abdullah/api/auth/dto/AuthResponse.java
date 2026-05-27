package com.abdullah.api.auth.dto;

public record AuthResponse(
        String accessToken,
        UserDto user
) {}
