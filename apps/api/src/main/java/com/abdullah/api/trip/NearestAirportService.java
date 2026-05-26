package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.NearestAirportDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class NearestAirportService {

    private final RestClient restClient;

    @Value("${google.maps.api-key}")
    private String apiKey;

    public NearestAirportService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://places.googleapis.com").build();
    }

    public NearestAirportDto findNearest(double lat, double lng) {
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
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location")
                .body(body)
                .retrieve()
                .body(PlacesResponse.class);

        if (response == null || response.places() == null || response.places().isEmpty()) {
            throw new RuntimeException("No airports found near " + lat + "," + lng);
        }

        Place p = response.places().getFirst();
        return new NearestAirportDto(p.id(), p.displayName().text(), p.formattedAddress(), p.location().latitude(), p.location().longitude());
    }

    // ── request body ─────────────────────────
    private record LatLng(double latitude, double longitude) {
    }

    private record Circle(LatLng center, double radius) {
    }

    private record LocationRestriction(Circle circle) {
    }

    private record SearchNearbyRequest(
            List<String> includedTypes,
            int maxResultCount,
            LocationRestriction locationRestriction
    ) {
    }

    // ── response body ────────────────────────
    private record PlacesResponse(List<Place> places) {
    }

    private record Place(String id, DisplayName displayName, String formattedAddress, Location location) {
    }

    private record DisplayName(String text, String languageCode) {
    }

    private record Location(double latitude, double longitude) {
    }
}