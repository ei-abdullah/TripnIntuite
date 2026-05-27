package com.abdullah.api.trip;

import com.abdullah.api.trip.agent.MatchedLocations;
import com.abdullah.api.trip.agent.ParsedSegments;
import com.abdullah.api.trip.dto.ParseResponse;
import com.abdullah.api.trip.dto.ParseResponse.SegmentWithLocations;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class CoordinatorService {

    private static final Logger log = LoggerFactory.getLogger(CoordinatorService.class);

    private final ChatClient coordinator;
    private final LocationFinderService locationFinder;

    public CoordinatorService(
        @Qualifier("coordinatorAgent") ChatClient coordinator,
        LocationFinderService locationFinder
    ) {
        this.coordinator = coordinator;
        this.locationFinder = locationFinder;
    }

    public ParseResponse parseAndFindAll(String prompt) {
        log.info("Coordinator parsing prompt: {}", prompt);
        long t0 = System.currentTimeMillis();

        ParsedSegments parsed = coordinator.prompt()
            .user(prompt)
            .call()
            .entity(ParsedSegments.class);

        assert parsed != null;
        log.info("Coordinator returned {} segments in {}ms",
            parsed.segments().size(), System.currentTimeMillis() - t0);

        List<CompletableFuture<MatchedLocations>> futures = parsed.segments().stream()
            .map(locationFinder::findForSegment)
            .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        List<SegmentWithLocations> segments = java.util.stream.IntStream.range(0, parsed.segments().size())
            .mapToObj(i -> SegmentWithLocations.of(
                parsed.segments().get(i),
                futures.get(i).join().locations()
            ))
            .toList();

        log.info("Parse complete: {} segments, total time {}ms",
            segments.size(), System.currentTimeMillis() - t0);

        return new ParseResponse(prompt, segments);
    }
}
