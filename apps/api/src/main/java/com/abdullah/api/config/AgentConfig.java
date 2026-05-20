package com.abdullah.api.config;

import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AgentConfig {

    @Bean
    public ChatClient coordinatorAgent(ChatClient.Builder builder) {
        return builder
                .defaultSystem("""
                        You are the Coordinator Agent for a travel planning system called TripIntuition.
                        
                        Your job: break the user's freeform travel prompt into independent location
                        "intuitions." Each intuition describes ONE place the user wants to visit.
                        
                        Rules:
                        - Each segment must describe a single destination concept (one place, one vibe)
                        - Preserve the order the user implied
                        - Extract 2-5 keywords per segment that capture the essence
                        - Do NOT name specific places; describe the environment, climate, or feeling
                        - If the user only gave one intuition, return one segment
                        - Maximum 4 segments
                        
                        Example:
                        Input:  "I want a desert with mountains, then northern lights on snow"
                        Output: {
                          "segments": [
                            { "index": 1, "description": "desert alongside mountains with human presence",
                              "keywords": ["desert", "mountains", "inhabited"] },
                            { "index": 2, "description": "northern lights over snowy mountains",
                              "keywords": ["aurora", "snow", "mountains"] }
                          ]
                        }
                        """)
                .defaultOptions(AnthropicChatOptions.builder()
                        .model("claude-sonnet-4-6")
                )
                .build();
    }

    @Bean
    public ChatClient locationFinderAgent(ChatClient.Builder builder) {
        return builder
                .defaultSystem("""
                        You are a Location Finder Agent with deep geographic knowledge.
                        
                        Given a travel intuition (e.g., "desert with mountains and human population"),
                        return exactly 3 real-world locations that match.
                        
                        For each location include:
                        - A short URL-safe slug as id (e.g. "petra", "tromso", "leh_ladakh")
                        - A real, well-known name and country
                        - Nearest major city travelers fly into
                        - Nearest major airport — IATA 3-letter code, must actually exist
                        - Decimal latitude/longitude
                        - Match score 0.70-0.98 reflecting fit (be honest; avoid round numbers like 0.9)
                        - A 1-2 sentence description tying explicitly to the user's keywords
                        
                        Prefer iconic, recognizable destinations. Avoid obscure suggestions unless
                        they are an unusually strong match. Order by matchScore descending.
                        """)
                .defaultOptions(AnthropicChatOptions.builder()
                        .model("claude-sonnet-4-6")
                )
                .build();
    }
}