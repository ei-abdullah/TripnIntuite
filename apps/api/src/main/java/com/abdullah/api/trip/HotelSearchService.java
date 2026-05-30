package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.HotelOptionDto;
import com.abdullah.api.trip.dto.HotelRatesDto;
import com.abdullah.api.trip.dto.HotelResultDto;
import com.abdullah.api.trip.dto.RoomOfferDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class HotelSearchService {

    private static final Logger log = LoggerFactory.getLogger(HotelSearchService.class);
    private static final int TOP_N = 8;
    private static final int FETCH_LIMIT = 50;
    // How many top-rated candidates we live-check for availability. Keeps the
    // rates payload small while still surfacing enough available hotels.
    private static final int CANDIDATE_POOL = 25;
    private static final double MIN_RATING = 7.0;
    private static final int MAX_ROOMS = 6;
    private static final String DEFAULT_CURRENCY = "USD";
    private static final String DEFAULT_NATIONALITY = "US";

    private final RestClient restClient;

    @Value("${liteapi.key}")
    private String apiKey;

    public HotelSearchService(
            RestClient.Builder builder,
            @Value("${liteapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public HotelResultDto searchHotels(
            double latitude, double longitude, int radiusMeters,
            String checkin, String checkout, int adults) {
        long t0 = System.currentTimeMillis();
        int nights = (int) ChronoUnit.DAYS.between(LocalDate.parse(checkin), LocalDate.parse(checkout));

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

        // Top candidates by rating; only these get a live availability check.
        List<HotelDataItem> candidates = response.data().stream()
                .filter(h -> h.id() != null && h.name() != null)
                .sorted(Comparator
                        .comparingDouble(HotelDataItem::rating).reversed()
                        .thenComparing(Comparator.comparingInt(HotelDataItem::reviewCount).reversed()))
                .limit(CANDIDATE_POOL)
                .toList();

        // hotelId -> cheapest offer for the dates. Empty if the rates call failed
        // or nothing is available; those hotels fall back to "rates on request".
        Map<String, OfferPrice> priceById = fetchAvailability(
                candidates.stream().map(HotelDataItem::id).toList(), checkin, checkout, adults);

        // Available-first: available hotels (ranked by price) come before the rest
        // (ranked by rating), so the list never looks empty in the sandbox.
        List<HotelOptionDto> options = candidates.stream()
                .map(h -> toHotelOption(h, priceById.get(h.id()), nights))
                .sorted(Comparator
                        .comparing(HotelOptionDto::available).reversed()
                        .thenComparing(o -> o.available() ? o.totalPrice() : Double.MAX_VALUE)
                        .thenComparing(Comparator.comparingDouble(HotelOptionDto::rating).reversed()))
                .limit(TOP_N)
                .toList();

        long available = options.stream().filter(HotelOptionDto::available).count();
        log.info("Hotel search lat={} lng={} r={}m {}->{}: {} candidates, {} shown ({} available) in {}ms",
                latitude, longitude, radiusMeters, checkin, checkout,
                candidates.size(), options.size(), available, System.currentTimeMillis() - t0);

        return new HotelResultDto(latitude, longitude, radiusMeters, options);
    }

    /**
     * Live availability + cheapest price for a batch of hotels over the dates.
     * Returns a map of hotelId -> cheapest offer. Resilient: any failure yields an
     * empty map so the listing degrades to content-only rather than erroring.
     */
    private Map<String, OfferPrice> fetchAvailability(
            List<String> hotelIds, String checkin, String checkout, int adults) {
        if (hotelIds.isEmpty()) return Map.of();

        Map<String, Object> body = Map.of(
                "hotelIds", hotelIds,
                "occupancies", List.of(Map.of("adults", adults)),
                "currency", DEFAULT_CURRENCY,
                "guestNationality", DEFAULT_NATIONALITY,
                "checkin", checkin,
                "checkout", checkout,
                "maxRatesPerHotel", 1
        );

        try {
            RatesResponse response = restClient.post()
                    .uri("/v3.0/hotels/rates")
                    .header("X-API-Key", apiKey)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(RatesResponse.class);

            if (response == null || response.data() == null) return Map.of();

            Map<String, OfferPrice> out = new LinkedHashMap<>();
            for (HotelRates hr : response.data()) {
                hr.roomTypes().stream()
                        .filter(rt -> rt.offerRetailRate() != null)
                        .map(RoomType::offerRetailRate)
                        .min(Comparator.comparingDouble(OfferPrice::amount))
                        .ifPresent(cheapest -> out.put(hr.hotelId(), cheapest));
            }
            return out;
        } catch (Exception e) {
            log.warn("Availability batch failed ({} hotels) {}->{}: {}",
                    hotelIds.size(), checkin, checkout, e.getMessage());
            return Map.of();
        }
    }

    /**
     * Fetch live room rates for one hotel over a date range. Used to populate the
     * detail drawer's pricing. Returns rooms sorted cheapest-first; an empty list
     * means no availability (or a sandbox gap), never an error to the caller.
     */
    public HotelRatesDto fetchRates(String hotelId, String checkin, String checkout, int adults) {
        long t0 = System.currentTimeMillis();
        int nights = (int) ChronoUnit.DAYS.between(LocalDate.parse(checkin), LocalDate.parse(checkout));

        Map<String, Object> body = Map.of(
                "hotelIds", List.of(hotelId),
                "occupancies", List.of(Map.of("adults", adults)),
                "currency", DEFAULT_CURRENCY,
                "guestNationality", DEFAULT_NATIONALITY,
                "checkin", checkin,
                "checkout", checkout
        );

        RatesResponse response;
        try {
            response = restClient.post()
                    .uri("/v3.0/hotels/rates")
                    .header("X-API-Key", apiKey)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(RatesResponse.class);
        } catch (Exception e) {
            // Never bubble a 500 to the client — the drawer just shows no rooms.
            log.warn("LiteAPI rates call failed for hotel={} {}→{}: {}", hotelId, checkin, checkout, e.getMessage());
            return new HotelRatesDto(hotelId, checkin, checkout, nights, DEFAULT_CURRENCY, List.of());
        }

        if (response == null || response.data() == null || response.data().isEmpty()) {
            log.warn("LiteAPI returned no rates for hotel={} {}→{}", hotelId, checkin, checkout);
            return new HotelRatesDto(hotelId, checkin, checkout, nights, DEFAULT_CURRENCY, List.of());
        }

        List<RoomOfferDto> rooms = response.data().getFirst().roomTypes().stream()
                .filter(rt -> rt.offerRetailRate() != null && !rt.rates().isEmpty())
                .map(this::toRoomOffer)
                .sorted(Comparator.comparingDouble(RoomOfferDto::totalAmount))
                .limit(MAX_ROOMS)
                .toList();

        log.info("Hotel rates {} {}→{}: {} rooms in {}ms",
                hotelId, checkin, checkout, rooms.size(), System.currentTimeMillis() - t0);

        return new HotelRatesDto(hotelId, checkin, checkout, nights, DEFAULT_CURRENCY, rooms);
    }

    private RoomOfferDto toRoomOffer(RoomType rt) {
        Rate first = rt.rates().getFirst();
        boolean refundable = first.cancellationPolicies() != null
                && "RFN".equalsIgnoreCase(first.cancellationPolicies().refundableTag());
        String deadline = null;
        if (first.cancellationPolicies() != null
                && first.cancellationPolicies().cancelPolicyInfos() != null
                && !first.cancellationPolicies().cancelPolicyInfos().isEmpty()) {
            deadline = first.cancellationPolicies().cancelPolicyInfos().getFirst().cancelTime();
        }
        List<String> perks = first.perks() == null ? List.of()
                : first.perks().stream().map(Perk::name).filter(p -> p != null && !p.isBlank()).toList();

        double suggested = rt.suggestedSellingPrice() != null
                ? rt.suggestedSellingPrice().amount() : rt.offerRetailRate().amount();

        return new RoomOfferDto(
                rt.offerId(),
                first.name(),
                first.boardName(),
                rt.offerRetailRate().amount(),
                suggested,
                rt.offerRetailRate().currency(),
                refundable,
                deadline,
                first.maxOccupancy(),
                perks
        );
    }

    private HotelOptionDto toHotelOption(HotelDataItem h, OfferPrice price, int nights) {
        boolean available = price != null;
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
                h.reviewCount(),
                available,
                available ? price.amount() : 0,
                available ? price.currency() : DEFAULT_CURRENCY,
                nights
        );
    }

    // --- rates response (POST /v3.0/hotels/rates) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RatesResponse(List<HotelRates> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HotelRates(String hotelId, List<RoomType> roomTypes) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RoomType(
            String offerId,
            OfferPrice offerRetailRate,
            OfferPrice suggestedSellingPrice,
            List<Rate> rates
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OfferPrice(double amount, String currency, String source) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Rate(
            String name,
            String boardName,
            int maxOccupancy,
            CancellationPolicies cancellationPolicies,
            List<Perk> perks
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CancellationPolicies(List<CancelInfo> cancelPolicyInfos, String refundableTag) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CancelInfo(String cancelTime, double amount, String currency, String type) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Perk(Integer perkId, String name, Double amount, String currency, String level) {}

    // --- hotel listing response (GET /v3.0/data/hotels) ---
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