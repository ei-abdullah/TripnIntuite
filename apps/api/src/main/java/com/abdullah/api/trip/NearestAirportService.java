package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.NearestAirportDto;
import com.abdullah.api.utils.Utils;
import com.opencsv.exceptions.CsvValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.List;

@Service
public class NearestAirportService {

    private final RestClient restClient;
    private final Utils utils = new Utils();

    @Value("${google.maps.api-key}")
    private String googleMapsApiKey;

    public NearestAirportService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://places.googleapis.com").build();
    }

    public NearestAirportDto findNearest(double lat, double lng) throws IOException {
        SearchNearbyRequest body = new SearchNearbyRequest(
                List.of("international_airport"),
                10,
                new LocationRestriction(
                        new Circle(
                                new LatLng(lat, lng),
                                50000.0
                        )
                )
        );

        PlacesResponse response = restClient.post()
                .uri("/v1/places:searchNearby")
                .header("X-Goog-Api-Key", googleMapsApiKey)
                .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location")
                .body(body)
                .retrieve()
                .body(PlacesResponse.class);

        if (response == null || response.places() == null || response.places().isEmpty()) {
            throw new RuntimeException("No airports found near " + lat + "," + lng);
        }

        Place p = response.places().getFirst();
        double placeLat = p.location().latitude();
        double placeLng = p.location().longitude();

        String iataCode;

        try {
            iataCode = utils.findClosestIataCode(placeLat, placeLng);
        } catch (CsvValidationException e) {
            throw new RuntimeException("Failed to read airports CSV " + e.getMessage(), e);
        }

        return new NearestAirportDto(
                p.id(),
                p.displayName().text(),
                p.formattedAddress(),
                placeLat,
                placeLng,
                iataCode
        );
    }

    // ── request body ─────────────────────────
    private record LatLng(double latitude, double longitude) {}
    private record Circle(LatLng center, double radius) {}
    private record LocationRestriction(Circle circle) {}
    private record SearchNearbyRequest(
            List<String> includedTypes,
            int maxResultCount,
            LocationRestriction locationRestriction
    ) {}

    // ── response body ────────────────────────
    private record PlacesResponse(List<Place> places) {}
    private record Place(String id, DisplayName displayName, String formattedAddress, Location location) {}
    private record DisplayName(String text, String languageCode) {}
    private record Location(double latitude, double longitude) {}
}