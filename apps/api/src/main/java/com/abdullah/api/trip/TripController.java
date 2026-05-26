package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.NearestAirportDto;
import com.abdullah.api.trip.dto.ParseRequest;
import com.abdullah.api.trip.dto.ParseResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/trip")
public class TripController {

    private final CoordinatorService coordinator;
    private final NearestAirportService nearestAirport;

    public TripController(CoordinatorService coordinator, NearestAirportService nearestAirport) {
        this.coordinator = coordinator;
        this.nearestAirport = nearestAirport;
    }

    @PostMapping("/parse")
    public ResponseEntity<ParseResponse> parse(@RequestBody ParseRequest request) {
        if (request.prompt() == null || request.prompt().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity
                .ok(coordinator.parseAndFindAll(request.prompt()));
    }

    @GetMapping("/nearest-airport")
    public NearestAirportDto nearestAirport(
            @RequestParam double lat,
            @RequestParam double lng
    ) {
        return nearestAirport.findNearest(lat, lng);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
