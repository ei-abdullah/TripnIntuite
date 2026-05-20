package com.abdullah.api.model.prompt;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

public record MatchedLocations(
    @JsonPropertyDescription("Exactly 3 real-world locations matching the intuition, sorted by matchScore descending")
    List<MatchedLocation> locations
) {
    public record MatchedLocation(
        @JsonPropertyDescription("URL-safe slug like 'petra' or 'leh_ladakh'")
        String id,

        @JsonPropertyDescription("Human-readable name in English")
        String name,

        @JsonPropertyDescription("Country name in English")
        String country,

        @JsonPropertyDescription("Nearest major city travelers fly into")
        String nearestCity,

        @JsonPropertyDescription("IATA 3-letter airport code, must actually exist")
        String nearestAirport,

        @JsonPropertyDescription("Latitude in decimal degrees, -90 to 90")
        double latitude,

        @JsonPropertyDescription("Longitude in decimal degrees, -180 to 180")
        double longitude,

        @JsonPropertyDescription("1-2 sentence description focusing on what makes this match the user's intuition")
        String description,

        @JsonPropertyDescription("Match quality 0.70-0.98. Avoid round numbers.")
        double matchScore
    ) {}
}