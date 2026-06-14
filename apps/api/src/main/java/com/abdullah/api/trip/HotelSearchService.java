package com.abdullah.api.trip;

import com.abdullah.api.trip.dto.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class HotelSearchService {

    private static final Logger log = LoggerFactory.getLogger(HotelSearchService.class);
    private static final int TOP_N = 8;
    private static final int FETCH_LIMIT = 50;
    private static final int CANDIDATE_POOL = 25;
    private static final double MIN_RATING = 7.0;
    private static final int MAX_ROOMS = 6;
    private static final int MAX_IMAGES = 20;
    private static final String DEFAULT_CURRENCY = "USD";
    private static final String DEFAULT_NATIONALITY = "US";
    private final RestClient restClient;
    private final RestClient bookClient;

    @Value("${liteapi.key}")
    private String apiKey;

    public HotelSearchService(
            RestClient.Builder builder,
            @Value("${liteapi.base-url}") String baseUrl,
            @Value("${liteapi.book-base-url}") String bookBaseUrl
    ) {
        this.restClient = builder.clone().baseUrl(baseUrl).build();
        this.bookClient = builder.clone().baseUrl(bookBaseUrl).build();
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

        List<HotelDataItem> candidates = response.data().stream()
                .filter(h -> h.id() != null && h.name() != null)
                .sorted(Comparator
                        .comparingDouble(HotelDataItem::rating).reversed()
                        .thenComparing(Comparator.comparingInt(HotelDataItem::reviewCount).reversed()))
                .limit(CANDIDATE_POOL)
                .toList();

        Map<String, OfferPrice> priceById = fetchAvailability(
                candidates
                        .stream()
                        .map(HotelDataItem::id)
                        .toList(),
                checkin,
                checkout,
                adults
        );

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

    public HotelDetailsDto fetchHotelDetails(String hotelId) {
        long t0 = System.currentTimeMillis();

        HotelDetailResponse response;
        try {
            response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v3.0/data/hotel")
                            .queryParam("hotelId", hotelId)
                            .build())
                    .header("X-API-Key", apiKey)
                    .header("accept", "application/json")
                    .retrieve()
                    .body(HotelDetailResponse.class);
        } catch (Exception e) {
            log.warn("Hotel details failed for {}: {}", hotelId, e.getMessage());
            return emptyDetails(hotelId);
        }

        if (response == null || response.data() == null) {
            return emptyDetails(hotelId);
        }
        HotelDetailData d = response.data();

        List<HotelImageDto> images = d.hotelImages() == null ? List.of()
                : d.hotelImages().stream()
                        .filter(img -> img.url() != null || img.urlHd() != null)
                        .sorted(Comparator
                                .comparing((HotelImage img) -> Boolean.TRUE.equals(img.defaultImage())).reversed()
                                .thenComparing(img -> img.order() == null ? Integer.MAX_VALUE : img.order()))
                        .map(img -> new HotelImageDto(
                                img.urlHd() != null && !img.urlHd().isBlank() ? img.urlHd() : img.url(),
                                img.caption()))
                        .limit(MAX_IMAGES)
                        .toList();

        List<String> facilities;
        if (d.facilities() != null && !d.facilities().isEmpty()) {
            facilities = d.facilities().stream()
                    .map(Facility::name).filter(n -> n != null && !n.isBlank()).distinct().toList();
        } else if (d.hotelFacilities() != null) {
            facilities = d.hotelFacilities().stream().filter(n -> n != null && !n.isBlank()).distinct().toList();
        } else {
            facilities = List.of();
        }

        String checkinTime = null;
        String checkoutTime = null;
        if (d.checkinCheckoutTimes() != null) {
            CheckinCheckoutTimes t = d.checkinCheckoutTimes();
            checkinTime = t.checkin() != null ? t.checkin() : t.checkinStart();
            checkoutTime = t.checkout();
        }

        List<HotelPolicyDto> policies = d.policies() == null ? List.of()
                : d.policies().stream()
                        .filter(p -> p.description() != null && !p.description().isBlank())
                        .map(p -> new HotelPolicyDto(
                                p.name() != null && !p.name().isBlank() ? p.name() : p.policyType(),
                                p.description()))
                        .toList();

        log.info("Hotel details {}: {} images, {} facilities, video={} in {}ms",
                hotelId, images.size(), facilities.size(), d.videoUrl() != null,
                System.currentTimeMillis() - t0);

        return new HotelDetailsDto(
                d.id() != null ? d.id() : hotelId,
                d.name(),
                d.hotelDescription(),
                d.hotelImportantInformation(),
                d.videoUrl(),
                images,
                facilities,
                checkinTime,
                checkoutTime,
                d.chain(),
                d.hotelType(),
                d.address(),
                d.phone(),
                d.email(),
                d.parking(),
                d.petsAllowed(),
                d.childAllowed(),
                policies
        );
    }

    private HotelDetailsDto emptyDetails(String hotelId) {
        return new HotelDetailsDto(hotelId, null, null, null, null,
                List.of(), List.of(), null, null, null, null, null, null, null,
                null, null, null, List.of());
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

    public PrebookResultDto prebookHotel(String offerId) {
        if (offerId == null || offerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "offerId is required");
        }
        long t0 = System.currentTimeMillis();

        PrebookResponse response;
        try {
            response = bookClient.post()
                    .uri("/v3.0/rates/prebook")
                    .header("X-API-Key", apiKey)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .body(Map.of("offerId", offerId, "usePaymentSdk", false))
                    .retrieve()
                    .body(PrebookResponse.class);
        } catch (Exception e) {
            log.warn("Prebook failed (offerId len={}): {}",
                    offerId.length(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This rate is no longer available. Please pick another room.");
        }

        if (response == null || response.data() == null || response.data().prebookId() == null) {
            log.warn("Prebook returned no data (offerId len={})", offerId.length());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Could not confirm this rate. Please try again.");
        }

        PrebookData d = response.data();
        log.info("Prebook ok: prebookId={} hotel={} price={} {} diff={}% cxlChg={} boardChg={} in {}ms",
                d.prebookId(), d.hotelId(), d.price(), d.currency(),
                d.priceDifferencePercent(), d.cancellationChanged(), d.boardChanged(),
                System.currentTimeMillis() - t0);

        return new PrebookResultDto(
                d.prebookId(),
                d.offerId(),
                d.hotelId(),
                d.checkin(),
                d.checkout(),
                d.currency() != null ? d.currency() : DEFAULT_CURRENCY,
                d.price(),
                d.priceDifferencePercent(),
                d.cancellationChanged(),
                d.boardChanged(),
                d.termsAndConditions(),
                d.paymentTypes() != null ? d.paymentTypes() : List.of()
        );
    }

    public HotelBookResultDto bookHotel(HotelBookRequest request) {
        if (request == null || request.prebookId() == null || request.prebookId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "prebookId is required");
        }

        long t0 = System.currentTimeMillis();

        List<GuestDto> guests = request.guests() != null ? request.guests() : List.of();
        List<GuestDto> numberedGuests = new ArrayList<>(guests.size());
        for (int i = 0; i < guests.size(); i++) {
            GuestDto g = guests.get(i);
            numberedGuests.add(new GuestDto(g.firstName(), g.lastName(), g.email(), i + 1));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("prebookId", request.prebookId());
        body.put("holder", request.holder());
        body.put("guests", numberedGuests);
        body.put("payment", Map.of("method", "ACC_CREDIT_CARD"));

        BookResponse response;

        try {
            response = bookClient.post()
                    .uri("/v3.0/rates/book")
                    .header("X-API-Key", apiKey)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(BookResponse.class);
        } catch (Exception e) {
            log.warn("Hotel book failed (prebookId={}): {}", request.prebookId(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Couldn't complete this booking. The rate may have expired — please re-reserve the room.");
        }

        if (response == null || response.data() == null || response.data().bookingId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Booking did not confirm. Please try again.");
        }

        BookData d = response.data();
        log.info("Hotel book ok: bookingId={} status={} conf={} price={} {} in {}ms",
                d.bookingId(), d.status(), d.hotelConfirmationCode(), d.price(), d.currency(),
                System.currentTimeMillis() - t0);

        return new HotelBookResultDto(
                d.bookingId(),
                d.status(),
                d.hotelConfirmationCode(),
                d.checkin(),
                d.checkout(),
                d.price(),
                d.currency() != null ? d.currency() : DEFAULT_CURRENCY
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HotelDetailResponse(HotelDetailData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HotelDetailData(
            String id,
            String name,
            String hotelDescription,
            String hotelImportantInformation,
            CheckinCheckoutTimes checkinCheckoutTimes,
            List<HotelImage> hotelImages,
            @JsonProperty("main_photo") String mainPhoto,
            String thumbnail,
            String videoUrl,
            String country,
            String city,
            Integer starRating,
            String address,
            List<String> hotelFacilities,
            String chain,
            List<Facility> facilities,
            String phone,
            String fax,
            String email,
            String hotelType,
            String airportCode,
            Double rating,
            Integer reviewCount,
            Boolean parking,
            Boolean childAllowed,
            Boolean petsAllowed,
            List<Policy> policies
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CheckinCheckoutTimes(String checkin, String checkout, String checkinStart, String checkinEnd) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HotelImage(String url, String urlHd, String caption, Integer order, Boolean defaultImage) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Facility(Integer facilityId, String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Policy(@JsonProperty("policy_type") String policyType, String name, String description) {}

    // --- prebook response (POST /v3.0/rates/prebook) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PrebookResponse(PrebookData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PrebookData(
            String prebookId,
            String offerId,
            String hotelId,
            String checkin,
            String checkout,
            String currency,
            double price,
            int priceDifferencePercent,
            boolean cancellationChanged,
            boolean boardChanged,
            String termsAndConditions,
            List<String> paymentTypes
    ) {}

    // --- book response (POST /v3.0/rates/book) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record BookResponse(BookData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record BookData(
            String bookingId,
            String status,
            String hotelConfirmationCode,
            String checkin,
            String checkout,
            double price,
            String currency
    ) {}

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