package com.abdullah.api.trip;

import com.abdullah.api.utils.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class GeocodingService {

    private final RestClient restClient;
    private final Utils utils = new Utils();

    @Value("${google.maps.api-key}")
    private String googleMapsApiKey;

    public GeocodingService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://maps.googleapis.com").build();
    }

    public LatLng geocode(String name, String country) {
        GeocodeResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/maps/api/geocode/json")
                        .queryParam("address", "%s, %s".formatted(name, country))
                        .queryParam("key", googleMapsApiKey)
                        .build()
                )
                .retrieve()
                .body(GeocodeResponse.class);

        if (response == null || response.results() == null || response.results().isEmpty()) {
            throw new RuntimeException("No results found for " + name + ", " + country);
        }

        LocationLatLng location = response.results().getFirst().geometry().location();
        return new LatLng(location.lat(), location.lng());
    }

    public record LatLng(double lat, double lng) {}

    private record GeocodeResponse(List<Result> results, String status) {
    }

    private record Result(Geometry geometry, String formatted_address) {
    }

    private record Geometry(LocationLatLng location) {
    }

    private record LocationLatLng(double lat, double lng) {
    }
}
