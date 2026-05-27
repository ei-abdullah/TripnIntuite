package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.FlightOptionDto;
import com.abdullah.api.trip.dto.LegResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class FlightSearchService {

    private static final Logger log = LoggerFactory.getLogger(FlightSearchService.class);
    private static final int TOP_N = 8;

    private final RestClient restClient;

    @Value("${liteapi.key}")
    private String apiKey;

    public FlightSearchService(RestClient.Builder builder, @Value("${liteapi.base-url}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public LegResultDto searchOneLeg(String origin, String destination, String date) {
        long t0 = System.currentTimeMillis();

        FlightSearchRequest body = new FlightSearchRequest(
                List.of(new Leg(origin, destination, date, "OUTBOUND")),
                1, 0, 0,
                "USD", "ECONOMY",
                new Filters(2)
        );

        LiteApiResponse response = restClient.post()
                .uri("/v3.0/flights/rates")
                .header("X-API-Key", apiKey)
                .body(body)
                .retrieve()
                .body(LiteApiResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            log.warn("LiteAPI returned no data for {} -> {} on {}", origin, destination, date);
            return new LegResultDto(origin, destination, date, List.of());
        }

        List<Journey> journeys = response.data().getFirst().journeys();
        if (journeys == null || journeys.isEmpty()) {
            log.warn("LiteAPI returned no journeys for {} -> {} on {}", origin, destination, date);
            return new LegResultDto(origin, destination, date, List.of());
        }

        List<FlightOptionDto> options = journeys.stream()
                .sorted(Comparator.comparingDouble(j -> j.cheapestOffer().pricing().display().total()))
                .limit(TOP_N)
                .map(FlightSearchService::toFlightOption)
                .toList();

        log.info("Flight search {} -> {} on {}: {} journeys returned, top {} in {}ms",
                origin, destination, date, journeys.size(), options.size(),
                System.currentTimeMillis() - t0);

        return new LegResultDto(origin, destination, date, options);
    }

    private static FlightOptionDto toFlightOption(Journey j) {
        List<Segment> segs = j.segments();
        Segment first = segs.getFirst();
        int stops = segs.size() - 1;

        List<String> via = stops == 0
                ? List.of()
                : IntStream.range(0, segs.size() - 1)
                        .mapToObj(i -> segs.get(i).destinationCode())
                        .toList();

        return new FlightOptionDto(
                j.cheapestOffer().offerId(),
                first.carrier().marketingCode(),
                first.carrier().marketingName(),
                first.carrier().marketingLogo(),
                first.flight().marketingNumber(),
                first.departureTime(),
                segs.getLast().arrivalTime(),
                j.totalDuration().minutes(),
                stops,
                via,
                j.cheapestOffer().pricing().display().total(),
                j.cheapestOffer().pricing().display().currency(),
                j.isCheapest()
        );
    }

    // ── request ───────────────────────────────
    private record Leg(String origin, String destination, String date, String direction) {}
    private record Filters(int maxStops) {}
    private record FlightSearchRequest(
            List<Leg> legs,
            int adults,
            int children,
            int infants,
            String currency,
            String cabinClass,
            Filters filters
    ) {}

    // ── response ──────────────────────────────
    private record LiteApiResponse(List<DataItem> data) {}
    private record DataItem(List<Journey> journeys) {}
    private record Journey(
            String journeyKey,
            boolean isCheapest,
            TotalDuration totalDuration,
            CheapestOffer cheapestOffer,
            List<Segment> segments
    ) {}
    private record TotalDuration(String iso8601, int minutes) {}
    private record CheapestOffer(String offerId, Pricing pricing) {}
    private record Pricing(Display display) {}
    private record Display(double total, String currency) {}
    private record Segment(
            String originCode,
            String destinationCode,
            String departureTime,
            String arrivalTime,
            SegmentDuration duration,
            Carrier carrier,
            Flight flight
    ) {}
    private record SegmentDuration(String iso8601, int minutes) {}
    private record Carrier(String marketingCode, String marketingName, String marketingLogo) {}
    private record Flight(String marketingNumber) {}
}