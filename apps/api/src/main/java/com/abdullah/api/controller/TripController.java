package com.abdullah.api.controller;

import com.abdullah.api.model.prompt.ParseRequest;
import com.abdullah.api.model.prompt.ParseResponse;
import com.abdullah.api.service.CoordinatorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/trip")
public class TripController {

    private final CoordinatorService coordinator;

    public TripController(CoordinatorService coordinator) {
        this.coordinator = coordinator;
    }

    @PostMapping("/parse")
    public ResponseEntity<ParseResponse> parse(@RequestBody ParseRequest request) {
        if (request.prompt() == null || request.prompt().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(coordinator.parseAndFindAll(request.prompt()));
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}