package com.abdullah.api.trip.dto;

import com.abdullah.api.trip.agent.MatchedLocations.MatchedLocation;
import com.abdullah.api.trip.agent.ParsedSegments.Segment;

import java.util.List;

public record ParseResponse(
    String prompt,
    List<SegmentWithLocations> segments
) {
    public record SegmentWithLocations(
        int index,
        String description,
        List<String> keywords,
        List<MatchedLocation> locations
    ) {
        public static SegmentWithLocations of(Segment segment, List<MatchedLocation> locations) {
            return new SegmentWithLocations(
                segment.index(),
                segment.description(),
                segment.keywords(),
                locations
            );
        }
    }
}
