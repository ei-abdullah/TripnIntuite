package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.HotelOptionDto;
import com.abdullah.api.trip.dto.HotelResultDto;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.List;

@Service
public class HotelSearchService {

    private static final Logger log = LoggerFactory.getLogger(HotelSearchService.class);
    private static final int TOP_N = 8;
    private static final int FETCH_LIMIT = 50;
    private static final double MIN_RATING = 7.0;

    private final RestClient restClient;

    @Value("${liteapi.key}")
    private String apiKey;

    public HotelSearchService(
            RestClient.Builder builder,
            @Value("${liteapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public HotelResultDto searchHotels(double latitude, double longitude, int radiusMeters) {
        long t0 = System.currentTimeMillis();

        HotelDataResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v3.0/data/hotels")
                        .queryParam("latitude", latitude)
                        .queryParam("longitude", longitude)
                        .queryParam("radius", radiusMeters)
                        .queryParam("minRating", MIN_RATING)
                        .queryParam("limit", FETCH_LIMIT)
                        .build())
                .header("X-API-Key", apiKey)
                .header("accept", "application/json")
                .retrieve()
                .body(HotelDataResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            log.warn("LiteAPI returned no hotels for lat={}, lng={}, radius={}m", latitude, longitude, radiusMeters);
            return new HotelResultDto(latitude, longitude, radiusMeters, List.of());
        }

        // Sort by rating desc, fall back to reviewCount for tie-breaks. Take top N.
        List<HotelOptionDto> options = response.data().stream()
                .filter(h -> h.id() != null && h.name() != null)
                .sorted(Comparator
                        .comparingDouble(HotelDataItem::rating).reversed()
                        .thenComparing(Comparator.comparingInt(HotelDataItem::reviewCount).reversed()))
                .limit(TOP_N)
                .map(this::toHotelOption)
                .toList();

        log.info("Hotel search lat={} lng={} r={}m: {} returned, top {} in {}ms",
                latitude, longitude, radiusMeters, response.data().size(), options.size(),
                System.currentTimeMillis() - t0);

        return new HotelResultDto(latitude, longitude, radiusMeters, options);
    }

    private HotelOptionDto toHotelOption(HotelDataItem h) {
        return new HotelOptionDto(
                h.id(),
                h.name(),
                h.hotelDescription(),
                h.chain(),
                h.address(),
                h.city(),
                h.country(),
                h.latitude(),
                h.longitude(),
                h.mainPhoto(),
                h.thumbnail(),
                h.stars(),
                h.rating(),
                h.reviewCount()
        );
    }

    private record HotelDataResponse(List<HotelDataItem> data, Integer total) {}

    private record HotelDataItem(
            String id,
            String name,
            String hotelDescription,
            String chain,
            String city,
            String country,
            String address,
            double latitude,
            double longitude,
            @JsonProperty("main_photo") String mainPhoto,
            String thumbnail,
            int stars,
            double rating,
            int reviewCount
    ) {}
}