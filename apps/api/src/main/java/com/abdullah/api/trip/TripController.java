package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.FlightBookRequest;
import com.abdullah.api.trip.dto.FlightBookResultDto;
import com.abdullah.api.trip.dto.HotelBookRequest;
import com.abdullah.api.trip.dto.HotelBookResultDto;
import com.abdullah.api.trip.dto.HotelDetailsDto;
import com.abdullah.api.trip.dto.HotelRatesDto;
import com.abdullah.api.trip.dto.HotelResultDto;
import com.abdullah.api.trip.dto.ItineraryEmailRequest;
import com.abdullah.api.trip.dto.LegResultDto;
import com.abdullah.api.trip.dto.NearestAirportDto;
import com.abdullah.api.trip.dto.ParseRequest;
import com.abdullah.api.trip.dto.ParseResponse;
import com.abdullah.api.trip.dto.PrebookRequest;
import com.abdullah.api.trip.dto.PrebookResultDto;
import com.abdullah.api.email.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/trip")
public class TripController {

    private final CoordinatorService coordinator;
    private final NearestAirportService nearestAirport;
    private final FlightSearchService flightSearch;
    private final HotelSearchService hotelSearch;
    private final EmailService emailService;

    public TripController(
            CoordinatorService coordinator,
            NearestAirportService nearestAirport,
            FlightSearchService flightSearch,
            HotelSearchService hotelSearch,
            EmailService emailService
    ) {
        this.coordinator = coordinator;
        this.nearestAirport = nearestAirport;
        this.flightSearch = flightSearch;
        this.hotelSearch = hotelSearch;
        this.emailService = emailService;
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
            @RequestParam String checkin,
            @RequestParam String checkout,
            @RequestParam(defaultValue = "25000") int radius,
            @RequestParam(defaultValue = "2") int adults
    ) {
        return hotelSearch.searchHotels(lat, lng, radius, checkin, checkout, adults);
    }

    @GetMapping("/hotels/{hotelId}/details")
    public HotelDetailsDto hotelDetails(@PathVariable String hotelId) {
        return hotelSearch.fetchHotelDetails(hotelId);
    }

    @GetMapping("/hotels/{hotelId}/rates")
    public HotelRatesDto hotelRates(
            @PathVariable String hotelId,
            @RequestParam String checkin,
            @RequestParam String checkout,
            @RequestParam(defaultValue = "2") int adults
    ) {
        return hotelSearch.fetchRates(hotelId, checkin, checkout, adults);
    }

    @PostMapping("/hotels/prebook")
    public PrebookResultDto prebook(@RequestBody PrebookRequest request) {
        return hotelSearch.prebookHotel(request.offerId());
    }

    @PostMapping("/hotels/book")
    public HotelBookResultDto bookHotel(@RequestBody HotelBookRequest request) {
        return hotelSearch.bookHotel(request);
    }

    @PostMapping("/flights/book")
    public FlightBookResultDto flightBook(@RequestBody FlightBookRequest request) {
        return flightSearch.bookFlight(request);
    }

    @PostMapping("/email/itinerary")
    public ResponseEntity<Map<String, Boolean>> emailItinerary(@RequestBody ItineraryEmailRequest request) {
        if (request.to() == null || request.to().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing recipient email.");
        }

        emailService.sendItineraryEmail(request);
        return ResponseEntity.accepted().body(Map.of("sent", true));
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
