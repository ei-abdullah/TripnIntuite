package com.abdullah.api.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    // Catch-all: any exception with no more specific handler above lands here.
    // Previously these fell through to Spring's default /error path, which does
    // NOT log the stack trace — so production 500s were invisible. Log the full
    // trace and still return our standard ApiError body.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("Unhandled exception on {} {} -> {}: {}",
                request.getMethod(), request.getRequestURI(),
                exception.getClass().getName(), exception.getMessage(), exception);
        // TEMP DEBUG: surface the real exception type + message in the response
        // body so failures are visible without digging through server logs.
        // Revert to a generic "Internal server error" message before going live.
        String detail = exception.getClass().getSimpleName()
                + (exception.getMessage() != null ? ": " + exception.getMessage() : "");
        return build(request, detail, HttpStatus.INTERNAL_SERVER_ERROR);
    }

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

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handle(
            ResponseStatusException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String message = exception.getReason() != null ? exception.getReason() : status.getReasonPhrase();
        return build(request, message, status);
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
