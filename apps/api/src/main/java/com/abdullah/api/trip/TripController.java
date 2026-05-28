package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.HotelResultDto;
import com.abdullah.api.trip.dto.LegResultDto;
import com.abdullah.api.trip.dto.NearestAirportDto;
import com.abdullah.api.trip.dto.ParseRequest;
import com.abdullah.api.trip.dto.ParseResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/trip")
public class TripController {

    private final CoordinatorService coordinator;
    private final NearestAirportService nearestAirport;
    private final FlightSearchService flightSearch;
    private final HotelSearchService hotelSearch;

    public TripController(
            CoordinatorService coordinator,
            NearestAirportService nearestAirport,
            FlightSearchService flightSearch,
            HotelSearchService hotelSearch
    ) {
        this.coordinator = coordinator;
        this.nearestAirport = nearestAirport;
        this.flightSearch = flightSearch;
        this.hotelSearch = hotelSearch;
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
    ) throws IOException {
        return nearestAirport.findNearest(lat, lng);
    }

    @GetMapping("/flights")
    public LegResultDto flights(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam String date
    ) {
        return flightSearch.searchOneLeg(origin, destination, date);
    }

    @GetMapping("/hotels")
    public HotelResultDto hotels(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "25000") int radius
    ) {
        return hotelSearch.searchHotels(lat, lng, radius);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
