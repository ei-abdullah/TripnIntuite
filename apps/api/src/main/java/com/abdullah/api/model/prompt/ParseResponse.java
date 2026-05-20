package com.abdullah.api.model.prompt;

import com.abdullah.api.model.prompt.MatchedLocations.MatchedLocation;
import com.abdullah.api.model.prompt.ParsedSegments.Segment;

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