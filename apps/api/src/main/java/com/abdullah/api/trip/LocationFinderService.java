package com.abdullah.api.trip;

import com.abdullah.api.trip.agent.MatchedLocations;
import com.abdullah.api.trip.agent.ParsedSegments.Segment;
import com.abdullah.api.utils.Utils;
import com.opencsv.exceptions.CsvValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class LocationFinderService {

    private static final Logger log = LoggerFactory.getLogger(LocationFinderService.class);
    private final GeocodingService geocodingService;

    private final ChatClient locationFinder;
    private final Utils utils;

    public LocationFinderService(
            GeocodingService geocodingService, @Qualifier("locationFinderAgent") ChatClient locationFinder,
            Utils utils
    ) {
        this.geocodingService = geocodingService;
        this.locationFinder = locationFinder;
        this.utils = utils;
    }

    @Async
    public CompletableFuture<MatchedLocations> findForSegment(Segment segment) {
        log.info("LocationFinder starting for segment {}: {}", segment.index(), segment.description());
        long start = System.currentTimeMillis();
        try {
            String userMessage = """
                Intuition: %s
                Keywords: %s

                Return exactly 3 real-world locations that match this intuition.
                """.formatted(segment.description(), String.join(", ", segment.keywords()));

            MatchedLocations result = locationFinder.prompt()
                .user(userMessage)
                .call()
                .entity(MatchedLocations.class);

            assert result != null;
            List<MatchedLocations.MatchedLocation> verified = result.locations().stream()
                    .map(loc -> {
                        GeocodingService.LatLng coords = geocodingService.geocode(loc.name(), loc.country());
                        String iata = null;
                        try {
                            iata = utils.findClosestIataCode(coords.lat(), coords.lng());
                        } catch (IOException | CsvValidationException e) {
                            throw new RuntimeException("Failed to read airports CSV " + e.getMessage(), e);
                        }

                        return new MatchedLocations.MatchedLocation(
                                loc.id(),
                                loc.name(),
                                loc.country(),
                                loc.nearestCity(),
                                iata,
                                coords.lat(),
                                coords.lng(),
                                loc.description(),
                                loc.matchScore()
                        );
                    })
                    .toList();

            long ms = System.currentTimeMillis() - start;
            assert result != null;
            log.info("LocationFinder completed segment {} in {}ms with {} locations",
                segment.index(), ms, result.locations().size());
            return CompletableFuture.completedFuture(new MatchedLocations(verified));
        } catch (Exception e) {
            log.error("LocationFinder failed for segment {}: {}", segment.index(), e.getMessage(), e);
            return CompletableFuture.completedFuture(new MatchedLocations(List.of()));
        }
    }
}
