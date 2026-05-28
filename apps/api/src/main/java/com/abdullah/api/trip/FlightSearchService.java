package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.Airport;
import com.abdullah.api.trip.dto.FlightOptionDto;
import com.abdullah.api.trip.dto.FlightOptionDto.ViaPoint;
import com.abdullah.api.trip.dto.LegResultDto;
import com.abdullah.api.utils.Utils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FlightSearchService {

    private static final Logger log = LoggerFactory.getLogger(FlightSearchService.class);
    private static final int TOP_N = 8;

    private final RestClient restClient;
    private final Utils utils;

    @Value("${liteapi.key}")
    private String apiKey;

    public FlightSearchService(
            RestClient.Builder builder,
            @Value("${liteapi.base-url}") String baseUrl,
            Utils utils
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.utils = utils;
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

        // LiteAPI returns one journey per fare class — same physical flight repeated
        // across Economy Lite / Classic / Flex etc. Dedupe by flight signature
        // (every segment's carrier + flight number + departure time), keeping the
        // cheapest fare variant in each group.
        Map<String, Journey> bySignature = journeys.stream()
                .collect(Collectors.toMap(
                        this::flightSignature,
                        j -> j,
                        (a, b) -> a.cheapestOffer().pricing().display().total()
                                <= b.cheapestOffer().pricing().display().total() ? a : b,
                        LinkedHashMap::new));

        List<FlightOptionDto> options = bySignature.values().stream()
                .sorted(Comparator.comparingDouble(j -> j.cheapestOffer().pricing().display().total()))
                .limit(TOP_N)
                .map(this::toFlightOption)
                .toList();

        log.info("Flight search {} -> {} on {}: {} journeys returned ({} unique), top {} in {}ms",
                origin, destination, date, journeys.size(), bySignature.size(), options.size(),
                System.currentTimeMillis() - t0);

        return new LegResultDto(origin, destination, date, options);
    }

    private FlightOptionDto toFlightOption(Journey j) {
        List<Segment> segs = j.segments();
        Segment first = segs.getFirst();
        Segment last = segs.getLast();
        int stops = segs.size() - 1;

        // ViaPoints = intermediate destinations (all segment.destinationCodes except the last one)
        List<ViaPoint> via = stops == 0
                ? List.of()
                : segs.subList(0, segs.size() - 1).stream()
                        .map(s -> lookupAirport(s.destinationCode()))
                        .filter(java.util.Objects::nonNull)
                        .map(a -> new ViaPoint(a.iataCode(), a.latitude(), a.longitude()))
                        .toList();

        Airport originAp = lookupAirport(first.originCode());
        Airport destAp = lookupAirport(last.destinationCode());
        double originLat = originAp != null ? originAp.latitude() : 0.0;
        double originLng = originAp != null ? originAp.longitude() : 0.0;
        double destLat = destAp != null ? destAp.latitude() : 0.0;
        double destLng = destAp != null ? destAp.longitude() : 0.0;

        return new FlightOptionDto(
                j.cheapestOffer().offerId(),
                first.carrier().marketingCode(),
                first.carrier().marketingName(),
                first.carrier().marketingLogo(),
                first.flight().marketingNumber(),
                first.departureTime(),
                last.arrivalTime(),
                j.totalDuration().minutes(),
                stops,
                via,
                j.cheapestOffer().pricing().display().total(),
                j.cheapestOffer().pricing().display().currency(),
                j.isCheapest(),
                originLat,
                originLng,
                destLat,
                destLng
        );
    }

    private String flightSignature(Journey j) {
        return j.segments().stream()
                .map(s -> s.carrier().marketingCode() + s.flight().marketingNumber() + "@" + s.departureTime())
                .collect(Collectors.joining("|"));
    }

    private Airport lookupAirport(String iata) {
        try {
            return utils.findAirportByIata(iata);
        } catch (Exception e) {
            log.warn("Airport lookup failed for {}: {}", iata, e.getMessage());
            return null;
        }
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