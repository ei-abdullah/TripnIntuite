package com.abdullah.api.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handle(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        return build(request, exception.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handle(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return build(request, message, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiError> handle(
            DuplicateResourceException exception,
            HttpServletRequest request
    ) {
        return build(request, exception.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handle(
            EntityNotFoundException exception,
            HttpServletRequest request
    ) {
        return build(request, exception.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handle(
            DisabledException exception,
            HttpServletRequest request
    ) {
        return build(request, "Verify your email before signing in.", HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handle(
            BadCredentialsException exception,
            HttpServletRequest request
    ) {
        return build(request, "Invalid email or password.", HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handle(
            AuthenticationException exception,
            HttpServletRequest request
    ) {
        return build(request, "Authentication required.", HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<ApiError> build(HttpServletRequest request, String message, HttpStatus status) {
        ApiError body = ApiError.builder()
                .path(request.getRequestURI())
                .message(message)
                .statusCode(status.value())
                .instantDateTime(Instant.now())
                .build();
        return new ResponseEntity<>(body, status);
    }
}
