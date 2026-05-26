package com.abdullah.api.trip.agent;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

public record ParsedSegments(
    @JsonPropertyDescription("List of independent travel intuition segments, in user-implied order")
    List<Segment> segments
) {
    public record Segment(
        @JsonPropertyDescription("1-based segment number")
        int index,

        @JsonPropertyDescription("One-sentence description of this intuition. Describes the vibe, not the place name.")
        String description,

        @JsonPropertyDescription("2-5 short keywords that capture the essence")
        List<String> keywords
    ) {}
}
