package com.abdullah.api.trip;

import com.abdullah.api.trip.agent.MatchedLocations;
import com.abdullah.api.trip.agent.ParsedSegments.Segment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class LocationFinderService {

    private static final Logger log = LoggerFactory.getLogger(LocationFinderService.class);

    private final ChatClient locationFinder;

    public LocationFinderService(
        @Qualifier("locationFinderAgent") ChatClient locationFinder
    ) {
        this.locationFinder = locationFinder;
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

            long ms = System.currentTimeMillis() - start;
            assert result != null;
            log.info("LocationFinder completed segment {} in {}ms with {} locations",
                segment.index(), ms, result.locations().size());
            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            log.error("LocationFinder failed for segment {}: {}", segment.index(), e.getMessage(), e);
            return CompletableFuture.completedFuture(new MatchedLocations(List.of()));
        }
    }
}
