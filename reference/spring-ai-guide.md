# Spring AI Guide — TripIntuition Backend

A complete, hackathon-focused reference for building the TripIntuition multi-agent backend with Spring AI 2.0.0-M6 on Spring Boot 4.0.6 + Java 21.

**Scope:** everything you need to write the Coordinator, Location Finder, and Sites Recommender agents. Everything else (RAG, tool calling, vector stores, memory, MCP) is explicitly out of scope and noted as "skip."

**Official reference root:** https://docs.spring.io/spring-ai/reference/index.html

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [The starter and what it auto-configures](#2-the-starter-and-what-it-auto-configures)
3. [`ChatClient` — the core API](#3-chatclient--the-core-api)
4. [Messages and roles](#4-messages-and-roles)
5. [Structured output via `.entity()`](#5-structured-output-via-entity)
6. [`application.yaml` configuration](#6-applicationyaml-configuration)
7. [Anthropic-specific options](#7-anthropic-specific-options)
8. [Multiple `ChatClient` beans — one per agent](#8-multiple-chatclient-beans--one-per-agent)
9. [`PromptTemplate` — parameterized prompts](#9-prompttemplate--parameterized-prompts)
10. [`@Async` + `CompletableFuture` — parallel agents](#10-async--completablefuture--parallel-agents)
11. [Error handling and retries](#11-error-handling-and-retries)
12. [Observability — token usage and metadata](#12-observability--token-usage-and-metadata)
13. [Testing agents](#13-testing-agents)
14. [End-to-end project shape](#14-end-to-end-project-shape)
15. [What to skip for the hackathon](#15-what-to-skip-for-the-hackathon)
16. [Reading order — official docs](#16-reading-order--official-docs)
17. [Cheat sheet](#17-cheat-sheet)

---

## 1. Mental model

Spring AI is **Spring's wrapper around LLM providers**. Without it, talking to Anthropic means:
- Manually build HTTP requests
- Manage API keys
- Parse JSON responses
- Re-implement schema validation
- Handle retries, timeouts, streaming

Spring AI replaces all that with **`ChatClient`** — a fluent builder where you say "here's a system prompt, here's a user message, give me back a typed Java object." Behind the scenes it picks the configured provider (Anthropic, OpenAI, Bedrock, Ollama, etc.) based on the starter you imported.

### Three layers (bottom to top)

1. **`ChatModel`** — provider-specific low-level client (`AnthropicChatModel`, `OpenAiChatModel`). Implements the raw HTTP call. You rarely touch this directly.
2. **`ChatClient`** — fluent, provider-agnostic API. **You use this 95% of the time.**
3. **Advisors / Tools / RAG** — higher-level features built on top. You're skipping these.

### Why this matters
Swapping Anthropic for OpenAI later is a one-line config change. The `ChatClient` API doesn't change. This is the same payoff Spring Data gives you when you swap Postgres for MySQL.

📖 Concepts: https://docs.spring.io/spring-ai/reference/concepts.html

---

## 2. The starter and what it auto-configures

Your `pom.xml` has:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-anthropic</artifactId>
</dependency>
```

This single starter triggers Spring Boot autoconfiguration that creates:

| Bean | Type | Purpose |
|------|------|---------|
| `anthropicApi` | `AnthropicApi` | Raw HTTP client to api.anthropic.com |
| `anthropicChatModel` | `AnthropicChatModel` | The `ChatModel` implementation |
| `chatClientBuilder` | `ChatClient.Builder` | What you inject into your services |

**You never declare any of these.** Just inject `ChatClient.Builder` and start building.

The config keys it watches:
- `spring.ai.anthropic.api-key` — required
- `spring.ai.anthropic.chat.options.*` — defaults applied to every call

If the key is missing, the app refuses to start. Good — fail fast.

### Removing OpenAI
Your pom also has `spring-ai-starter-model-openai`. If both starters are present and both API keys are configured, Spring creates **two** `ChatModel` beans — and `ChatClient.Builder` injection becomes ambiguous (`NoUniqueBeanDefinitionException`). Either:
- Remove the OpenAI starter (recommended)
- Mark one chat model as `@Primary`, or
- Use `@Qualifier` to pick a builder

For the hackathon: remove it.

---

## 3. `ChatClient` — the core API

📖 https://docs.spring.io/spring-ai/reference/api/chatclient.html

### Getting one

Spring Boot creates a `ChatClient.Builder` bean. You inject the **builder**, not a finished `ChatClient`, because each agent in your app needs different configuration.

```java
@Service
public class CoordinatorService {
    private final ChatClient chatClient;

    public CoordinatorService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
}
```

`builder.build()` snapshots the configuration into an immutable `ChatClient`. After this point you cannot change defaults on this client — but you can still override per-call.

### The full call shape

```java
String content = chatClient
    .prompt()                              // 1. start a request
    .system("You are a helpful assistant.")// 2. system message
    .user("What's 2+2?")                   // 3. user message
    .call()                                // 4. execute synchronously
    .content();                            // 5. extract just the text
```

Every step returns the builder, so you chain. The flow is:

```
.prompt()  →  ChatClientRequestSpec
             ├─ .system(...)       ──┐
             ├─ .user(...)           │  build the request
             ├─ .messages(...)       │
             └─ .options(...)      ──┘
             │
             └─ .call()  →  CallResponseSpec
                          ├─ .content()        → String
                          ├─ .entity(Class)    → typed object
                          ├─ .chatResponse()   → ChatResponse (with metadata)
                          └─ .responseEntity() → ResponseEntity<T>
```

### `.call()` vs `.stream()`

- **`.call()`** blocks until the full response arrives. Use this for everything in your hackathon.
- **`.stream()`** returns a Reactor `Flux<String>` of tokens as they arrive. Only useful for live-typing UX. Requires reactive plumbing — skip.

### Inline variable substitution

Real conversations often have placeholders:

```java
chatClient.prompt()
    .system("You are a translator.")
    .user(u -> u.text("Translate to {lang}: {phrase}")
                .param("lang", "French")
                .param("phrase", "Hello world"))
    .call()
    .content();
```

The `u -> u.text(...).param(...)` lambda form uses the same template engine as `PromptTemplate` (covered in §9).

### Per-call options override

You can override model/temperature for a single call:

```java
chatClient.prompt()
    .options(AnthropicChatOptions.builder()
        .temperature(0.9)        // override default temp for this call only
        .build())
    .user("Be creative...")
    .call()
    .content();
```

Useful when 90% of calls want temp 0.2 but one creative call wants 0.9.

---

## 4. Messages and roles

📖 https://docs.spring.io/spring-ai/reference/api/prompt.html

Every LLM call is a conversation of **messages**. Each message has a **role**:

| Role | Java class | Purpose |
|------|-----------|---------|
| `system` | `SystemMessage` | Sets identity, rules, format. Always at start. |
| `user` | `UserMessage` | Human input (or simulated input). |
| `assistant` | `AssistantMessage` | Previous AI replies (for multi-turn). |
| `tool` | `ToolResponseMessage` | Tool/function call result. Not used in your project. |

For TripIntuition every call is **one-shot**: one system + one user → one assistant reply. No multi-turn memory needed.

### Three ways to pass messages

**Inline string (simplest):**
```java
chatClient.prompt()
    .system("You are X")
    .user("Do Y")
    .call();
```

**Message objects (more control):**
```java
chatClient.prompt()
    .messages(
        new SystemMessage("You are X"),
        new UserMessage("Do Y")
    )
    .call();
```

**Mixed:**
```java
chatClient.prompt()
    .system("You are X")
    .messages(new UserMessage("Earlier"), new AssistantMessage("Reply"))
    .user("Now do Z")
    .call();
```

### System prompt best practices

The system prompt is the most leveraged piece of text in your project. Each agent's behavior is largely a function of its system prompt.

**Rules that work well:**

1. **State the role explicitly:** "You are a travel coordinator agent."
2. **State the job in one sentence:** "Your job is to break a user's freeform travel prompt into independent location segments."
3. **List rules as bullet points** — LLMs handle structured rules better than prose.
4. **Show one example** for ambiguous cases.
5. **State output format last** — though `.entity()` adds JSON schema instructions automatically, you can still be explicit.

**Template I'd recommend:**

```
You are a [ROLE].

Your job: [ONE-SENTENCE TASK].

Rules:
- [Rule 1]
- [Rule 2]
- [Rule 3]

Example:
Input: "..."
Output: { ... }

Return only the JSON object described in the schema. Do not include prose.
```

---

## 5. Structured output via `.entity()`

📖 https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html

**This is the single most important feature for your project.** Without it, your agents return raw text, you regex-extract JSON, and pray. With it, the LLM is *coerced* to return JSON that matches a Java record's shape.

### How it works under the hood

When you call `.entity(SomeRecord.class)`:
1. Spring AI introspects the record using Jackson + the JSON schema generator
2. It appends an instruction to your prompt: *"Your response must be a JSON object matching this schema: {...}"*
3. The LLM returns JSON
4. Spring AI parses it into your record and returns the typed object

You never see the JSON. You just get a typed object.

### Define your records first

Records (Java 16+) are immutable, concise, and Jackson-friendly. Use them.

```java
public record ParsedSegments(List<Segment> segments) {
    public record Segment(
        int index,
        String description,
        List<String> keywords
    ) {}
}
```

### Call with `.entity()`

```java
ParsedSegments parsed = chatClient.prompt()
    .system("""
        You are a travel coordinator. Break the user's prompt into independent
        travel "intuitions." Each intuition is one location segment.
        """)
    .user(rawPrompt)
    .call()
    .entity(ParsedSegments.class);

// parsed.segments() is a real List<Segment> — no JSON parsing in your code
parsed.segments().forEach(s ->
    log.info("Segment {}: {}", s.index(), s.description()));
```

### Lists at the top level

You can't write `.entity(List<Foo>.class)` because of Java's type erasure. Two workarounds:

**Option A — wrap in a record (recommended):**
```java
public record MatchedLocations(int segmentIndex, List<Location> locations) {}
```

**Option B — `ParameterizedTypeReference`:**
```java
List<String> sites = chatClient.prompt()
    .user("List 5 attractions in Petra")
    .call()
    .entity(new ParameterizedTypeReference<List<String>>() {});
```

The anonymous-subclass trick preserves the generic type at runtime.

### Maps too

```java
Map<String, Integer> counts = chatClient.prompt()
    .user("Count vowels per word in: 'hello world'")
    .call()
    .entity(new ParameterizedTypeReference<Map<String, Integer>>() {});
```

### What records turn into

Spring AI uses Jackson, so:

| Java | JSON |
|------|------|
| `record Foo(String name, int age)` | `{"name": "...", "age": 0}` |
| `List<T>` | JSON array `[...]` |
| `Map<String, V>` | JSON object `{"key": ...}` |
| Nested records | Nested JSON objects |
| Enums | JSON strings of enum names |
| `Optional<T>` | Property may be missing |
| `LocalDate`, `LocalDateTime` | ISO 8601 strings (with `jackson-datatype-jsr310`) |

### Add field descriptions with `@JsonPropertyDescription`

These descriptions are embedded in the schema sent to the LLM. They drastically improve output quality.

```java
public record Location(
    @JsonPropertyDescription("URL-safe slug like 'petra' or 'tromso'")
    String id,

    @JsonPropertyDescription("Human-readable name in English")
    String name,

    @JsonPropertyDescription("Country in English")
    String country,

    @JsonPropertyDescription("Nearest major city for travelers")
    String nearestCity,

    @JsonPropertyDescription("IATA 3-letter airport code (e.g. AMM, JFK). Verify it exists.")
    String nearestAirport,

    @JsonPropertyDescription("Latitude in decimal degrees, -90 to 90")
    double latitude,

    @JsonPropertyDescription("Longitude in decimal degrees, -180 to 180")
    double longitude,

    @JsonPropertyDescription("1-2 sentence description focusing on what makes this match the user's intuition")
    String description,

    @JsonPropertyDescription("Match quality 0.0 (poor) to 1.0 (perfect fit)")
    double matchScore
) {}
```

The `import com.fasterxml.jackson.annotation.JsonPropertyDescription;` is part of Jackson, already on classpath via Spring Web.

### Gotchas

- **The LLM can still fail to produce valid JSON.** Wrap `.entity()` in a try/catch and have a fallback.
- **Don't make records too deep.** Two-to-three levels of nesting max — LLMs degrade past that. Flatten when you can.
- **`enum` works but is brittle.** If the LLM hallucinates a value not in your enum, you get an exception. Prefer `String` + validate yourself.
- **`null` vs missing** — Jackson treats `null` and "field absent" differently. Records require all fields. Use `Optional<T>` or default values defensively.
- **Schema size matters** — very large records produce large schemas, which consume tokens and confuse the model. Keep records focused.

### What the LLM actually sees

Spring AI appends something like this to your prompt (paraphrased):

```
Your response must be a JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "segments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "index": {"type": "integer"},
          "description": {"type": "string"},
          "keywords": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["index", "description", "keywords"]
      }
    }
  },
  "required": ["segments"]
}

Return ONLY the JSON object, no prose, no markdown fences.
```

Modern Claude models follow this extremely reliably. Failure rate is well under 1%.

---

## 6. `application.yaml` configuration

📖 https://docs.spring.io/spring-ai/reference/api/chat/anthropic-chat.html#_chat_properties

Recommended starting config for `src/main/resources/application.yaml`:

```yaml
spring:
  application:
    name: api

  jackson:
    default-property-inclusion: non_null   # drops null fields when serializing outbound JSON

  ai:
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
      chat:
        options:
          model: claude-opus-4-7
          temperature: 0.3
          max-tokens: 4096

# Your own custom config
duffel:
  base-url: https://api.duffel.com
  token: ${DUFFEL_ACCESS_TOKEN}

# CORS for the Next.js frontend
app:
  cors:
    allowed-origins:
      - http://localhost:3000

logging:
  level:
    org.springframework.ai: INFO
    com.abdullah.api: DEBUG
```

### Key anthropic knobs

| Property | Purpose | Recommendation |
|----------|---------|----------------|
| `api-key` | Required. Env var only — never hardcode. | `${ANTHROPIC_API_KEY}` |
| `chat.options.model` | Model ID. | `claude-opus-4-7` for quality, `claude-haiku-4-5-20251001` for cheap/fast |
| `chat.options.temperature` | 0.0 = deterministic, 1.0 = creative. | `0.2` Coordinator, `0.5` LocationFinder, `0.7` SitesRecommender |
| `chat.options.max-tokens` | Cap on response length in tokens. | `4096` is fine; raise to `8192` if responses truncate |
| `chat.options.top-p` | Nucleus sampling. | Leave default unless you know why |
| `chat.options.top-k` | Top-K sampling. | Leave default |
| `base-url` | Override the Anthropic API base URL. | Default works |

These are **defaults**. Per-bean overrides via `AnthropicChatOptions.builder()` always win.

### Env vars

Set in your shell or IDE run config:

```bash
ANTHROPIC_API_KEY=sk-ant-...
DUFFEL_ACCESS_TOKEN=duffel_test_...
MAPBOX_ACCESS_TOKEN=pk....
UNSPLASH_ACCESS_KEY=...
```

In IntelliJ: Run Configuration → Environment variables. In Windows shell: `$env:ANTHROPIC_API_KEY = "sk-ant-..."` before running.

---

## 7. Anthropic-specific options

📖 https://docs.spring.io/spring-ai/reference/api/chat/anthropic-chat.html

`AnthropicChatOptions` is the type-safe options builder for per-call or per-bean overrides:

```java
AnthropicChatOptions options = AnthropicChatOptions.builder()
    .model("claude-opus-4-7")
    .temperature(0.2)
    .maxTokens(4096)
    .topP(0.95)
    .topK(40)
    .stopSequences(List.of("\n\nUser:"))   // halt on these strings
    .build();
```

### Model picking guide

| Model ID | Speed | Cost | When to use |
|----------|-------|------|-------------|
| `claude-opus-4-7` | Slowest | Highest | Coordinator, LocationFinder (need reasoning + geography knowledge) |
| `claude-sonnet-4-6` | Medium | Medium | If Opus rate-limits during demo, fall back to Sonnet |
| `claude-haiku-4-5-20251001` | Fastest | Lowest | SitesRecommender (simple list generation) |

### Temperature guide for your agents

| Agent | Temp | Why |
|-------|------|-----|
| Coordinator | 0.2 | Same input should produce same segmentation. Low variability = reproducible demo. |
| LocationFinder | 0.5 | Some variety in suggestions is nice (different runs surface different real places). |
| SitesRecommender | 0.7 | More creativity for varied attraction lists. |

### Stop sequences

If you ever see Claude continuing past your intended output, add `.stopSequences(List.of("\n\n", "Human:"))`. For TripIntuition you won't need this — `.entity()` keeps responses bounded.

---

## 8. Multiple `ChatClient` beans — one per agent

You need three differently-configured ChatClients. The pattern: a `@Configuration` class with three `@Bean` methods, each producing a `ChatClient` from the shared builder.

### Full `AgentConfig.java`

```java
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
                - Each segment must be self-contained and describe a single destination concept
                - Preserve the order the user implied
                - Extract 2-5 keywords per segment that capture the essence
                - Do NOT name specific places; describe the environment/vibe
                - If the user only gave one intuition, return one segment

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
                .model("claude-opus-4-7")
                .temperature(0.2)
                .build())
            .build();
    }

    @Bean
    public ChatClient locationFinderAgent(ChatClient.Builder builder) {
        return builder
            .defaultSystem("""
                You are a Location Finder Agent with deep geographic knowledge.

                Given a travel intuition (e.g., "desert with mountains and human population"),
                return 3-4 real-world locations that match.

                For each location include:
                - A real, well-known name and country
                - Nearest major airport (IATA 3-letter code) — verify the code actually exists
                - Decimal latitude/longitude
                - Match score 0.0-1.0 reflecting how well it fits the intuition
                - A 1-2 sentence description that explicitly ties to the user's keywords

                Prefer iconic, recognizable destinations. Avoid obscure suggestions
                unless they are an unusually strong match.
                """)
            .defaultOptions(AnthropicChatOptions.builder()
                .model("claude-opus-4-7")
                .temperature(0.5)
                .build())
            .build();
    }

    @Bean
    public ChatClient sitesRecommenderAgent(ChatClient.Builder builder) {
        return builder
            .defaultSystem("""
                You recommend 4-6 must-visit attractions for a given city or area.
                Return only attraction names, no descriptions, no commentary.
                Iconic over obscure. Tourist-friendly over local-only.
                """)
            .defaultOptions(AnthropicChatOptions.builder()
                .model("claude-haiku-4-5-20251001")
                .temperature(0.7)
                .build())
            .build();
    }
}
```

### Inject them with `@Qualifier`

Since all three beans share the type `ChatClient`, Spring can't disambiguate by type — use the bean name:

```java
@Service
public class CoordinatorService {

    private final ChatClient coordinator;

    public CoordinatorService(
        @Qualifier("coordinatorAgent") ChatClient coordinator
    ) {
        this.coordinator = coordinator;
    }
}
```

The bean name matches the `@Bean` method name unless you override with `@Bean("custom-name")`.

### Why `defaultSystem` instead of `.system()` on every call?

DRY. The system prompt is the agent's **identity** — it doesn't change call-to-call. Set it once at bean construction, and every `.prompt()` automatically includes it. You can still override per-call if needed.

### Why a separate model for the SitesRecommender?

- **Haiku is ~10x cheaper and ~3x faster** than Opus
- Listing 5 well-known attractions is a simple recall task — no deep reasoning needed
- Coordinator and LocationFinder benefit from Opus's better reasoning + broader geographic knowledge

---

## 9. `PromptTemplate` — parameterized prompts

📖 https://docs.spring.io/spring-ai/reference/api/prompt.html#_prompttemplate

When you call the SitesRecommender for *each* of the user's chosen locations, the prompt is the same shape but the location changes. Don't string-concatenate — use `PromptTemplate`:

```java
PromptTemplate template = new PromptTemplate("""
    Recommend 4-6 must-visit attractions in {locationName}, {country}.
    Focus on iconic spots a first-time visitor wouldn't want to miss.
    """);

Prompt prompt = template.create(Map.of(
    "locationName", "Petra",
    "country", "Jordan"
));

List<String> sites = chatClient.prompt(prompt)
    .call()
    .entity(new ParameterizedTypeReference<List<String>>() {});
```

The `{variable}` syntax uses StringTemplate under the hood.

### Inline alternative

For one-shot calls:

```java
chatClient.prompt()
    .user(u -> u.text("Recommend attractions in {city}, {country}")
                .param("city", "Petra")
                .param("country", "Jordan"))
    .call()
    .content();
```

Same engine, shorter syntax.

### When to extract templates vs inline

- **Inline `.param()`** — for prompts used in one place
- **`PromptTemplate` constant** — when the template is reused across methods, or long enough to deserve its own constant

I'd put each agent's prompts in a `Prompts` constants class so they're easy to tune:

```java
public final class Prompts {

    public static final String COORDINATOR_SYSTEM = """
        You are the Coordinator Agent... [full prompt]
        """;

    public static final String SITES_USER_TEMPLATE = """
        Recommend 4-6 must-visit attractions in {locationName}, {country}.
        """;

    private Prompts() {}
}
```

---

## 10. `@Async` + `CompletableFuture` — parallel agents

📖 https://docs.spring.io/spring-framework/reference/integration/scheduling.html#scheduling-annotation-support-async

This isn't a Spring AI feature, but it's how your **dynamic N-agent fanout** works. The wow moment in your demo is that 1 intuition = 1 agent and 5 intuitions = 5 agents running **simultaneously**, all in parallel.

### Step 1: Enable async on the application

```java
package com.abdullah.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class Main {
    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
    }
}
```

Without `@EnableAsync`, `@Async` annotations are silently ignored.

### Step 2: Mark methods `@Async`

```java
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
        log.info("LocationFinder starting for segment {}: {}",
                 segment.index(), segment.description());
        try {
            MatchedLocations result = locationFinder.prompt()
                .user(segment.description())
                .call()
                .entity(MatchedLocations.class);
            log.info("LocationFinder completed segment {} with {} locations",
                     segment.index(), result.locations().size());
            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            log.error("LocationFinder failed for segment {}: {}",
                      segment.index(), e.getMessage());
            return CompletableFuture.completedFuture(
                new MatchedLocations(segment.index(), List.of())
            );
        }
    }
}
```

**Critical gotchas:**

- `@Async` only works on `public` methods called **from another bean**. Calling `findForSegment()` from inside the same class bypasses the Spring proxy and runs synchronously.
- The return type must be `CompletableFuture<T>` (or `void`, or `Future<T>`). Returning plain `T` makes Spring run synchronously.
- The method body must return `CompletableFuture.completedFuture(value)` — Spring wraps the call in a future internally but you still return one.
- Exceptions inside `@Async` methods don't propagate the same way. Always catch and convert to a normal return or a `CompletableFuture.failedFuture(e)`.

### Step 3: Fan out, then join

```java
@Service
public class CoordinatorService {

    private final ChatClient coordinator;
    private final LocationFinderService locationFinder;

    public CoordinatorService(
        @Qualifier("coordinatorAgent") ChatClient coordinator,
        LocationFinderService locationFinder
    ) {
        this.coordinator = coordinator;
        this.locationFinder = locationFinder;
    }

    public Map<Integer, MatchedLocations> parseAndFindAll(String rawPrompt) {
        // 1. Coordinator parses prompt into N segments (sequential, one call)
        ParsedSegments parsed = coordinator.prompt()
            .user(rawPrompt)
            .call()
            .entity(ParsedSegments.class);

        // 2. Spawn one async agent per segment (parallel, N calls)
        List<CompletableFuture<MatchedLocations>> futures = parsed.segments().stream()
            .map(locationFinder::findForSegment)
            .toList();

        // 3. Wait for all to finish (blocks until last one returns)
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // 4. Collect results into a Map keyed by segment index
        return futures.stream()
            .map(CompletableFuture::join)   // safe — already complete
            .collect(Collectors.toMap(
                MatchedLocations::segmentIndex,
                Function.identity()
            ));
    }
}
```

### Step 4: Configure the thread pool (optional but recommended)

Default Spring `@Async` uses `SimpleAsyncTaskExecutor` which **creates a new thread per call** — no pooling. Fine for the hackathon (you'll never have 100 concurrent agents) but if you want to be tidy:

```java
@Configuration
public class AsyncConfig {

    @Bean(name = "agentExecutor")
    public Executor agentExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("agent-");
        executor.initialize();
        return executor;
    }
}
```

Then `@Async("agentExecutor")` on your method picks this specific executor.

### Why `CompletableFuture.allOf(...).join()` and not `.get()`?

- `.join()` throws unchecked `CompletionException` — easier in lambdas
- `.get()` throws checked `InterruptedException` + `ExecutionException` — verbose

Both block until completion. `.join()` is the idiomatic choice for `CompletableFuture`.

### Visualizing the parallelism

```
T=0  ──→ Coordinator runs (sequential, blocks ~1-2s)
T=2  ──→ Spawn agent-1, agent-2, agent-3 (all start)
        │
        │   ┌─ agent-1 [████░░░░] 1.8s
        │   ├─ agent-2 [██████░░] 2.4s
        │   └─ agent-3 [████████] 3.1s
        │
T=5  ──→ All joined; return Map<Integer, MatchedLocations>
```

Total time ≈ Coordinator time + slowest LocationFinder time, not the sum.

---

## 11. Error handling and retries

📖 https://docs.spring.io/spring-ai/reference/api/retry.html

LLMs fail in five distinct ways. You need to handle them differently:

| Failure | Cause | Handle by |
|---------|-------|-----------|
| `NonTransientAiException` | 4xx errors — bad API key, malformed request, content policy block | Log + fail fast, no retry |
| `TransientAiException` | 5xx errors, network blips | Retry with backoff (Spring Retry) |
| Rate limit (429) | Too many requests | Backoff + retry |
| JSON parse failure from `.entity()` | LLM returned malformed JSON | Catch `Exception`, return empty/fallback result |
| Timeout | LLM took too long | Configure HTTP client timeout; treat as transient |

### Minimum viable pattern

```java
try {
    return locationFinder.prompt().user(segment.description())
        .call().entity(MatchedLocations.class);
} catch (Exception e) {
    log.error("LocationFinder failed for segment {}: {}",
              segment.index(), e.getMessage());
    return new MatchedLocations(segment.index(), List.of());
}
```

Returning an empty result lets the demo continue even if one agent fails — the user just sees fewer suggestions for that segment instead of a 500 error.

### Spring Retry integration

Add to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-aspects</artifactId>
</dependency>
```

Enable retry on `Main`:

```java
@SpringBootApplication
@EnableAsync
@EnableRetry
public class Main { ... }
```

Annotate methods:

```java
@Retryable(
    retryFor = { TransientAiException.class },
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public MatchedLocations findForSegment(Segment segment) {
    return locationFinder.prompt()...
}

@Recover
public MatchedLocations recover(TransientAiException e, Segment segment) {
    log.error("All retries exhausted for segment {}", segment.index());
    return new MatchedLocations(segment.index(), List.of());
}
```

Spring AI also has **built-in retry** via `RetryTemplate` auto-configuration — set `spring.ai.retry.max-attempts: 3` in yaml.

### What I'd actually do for hackathon

Skip Spring Retry. Catch broad `Exception` and return a fallback. The complexity of retry config isn't worth it for a 48-hour demo.

---

## 12. Observability — token usage and metadata

📖 https://docs.spring.io/spring-ai/reference/observability/index.html

When you need to know how many tokens a call used (for cost tracking, or to verify the model isn't truncating):

```java
ChatResponse response = chatClient.prompt()
    .user(rawPrompt)
    .call()
    .chatResponse();    // returns ChatResponse instead of just content

String content = response.getResult().getOutput().getText();

ChatResponseMetadata meta = response.getMetadata();
Usage usage = meta.getUsage();
log.info("Tokens: prompt={}, completion={}, total={}",
    usage.getPromptTokens(),
    usage.getCompletionTokens(),
    usage.getTotalTokens());
log.info("Finish reason: {}", meta.get("finish-reason"));
```

For your hackathon, log token usage from the Coordinator so you can show judges "we processed your prompt in X tokens." It's a small touch but reads as professional.

### Spring AI's observability auto-config

If you add `spring-boot-starter-actuator` + Micrometer, Spring AI emits metrics like:
- `spring.ai.chat.client.requests` — count of calls
- `spring.ai.chat.client.token.usage` — token histogram

Visible at `/actuator/metrics`. Skip for hackathon unless you're already using Actuator.

---

## 13. Testing agents

📖 https://docs.spring.io/spring-ai/reference/api/testing.html

### Don't test prompts against the real API in unit tests

Slow, flaky, costs money. Mock the `ChatClient` or use a test `ChatModel`.

### Pattern: mock the ChatClient

```java
@ExtendWith(MockitoExtension.class)
class CoordinatorServiceTest {

    @Mock ChatClient coordinator;
    @Mock LocationFinderService locationFinder;

    @Test
    void parsesPromptIntoSegments() {
        // Setup chain mock
        var spec = mock(ChatClient.ChatClientRequestSpec.class, RETURNS_DEEP_STUBS);
        when(coordinator.prompt()).thenReturn(spec);
        when(spec.user(anyString()).call().entity(ParsedSegments.class))
            .thenReturn(new ParsedSegments(List.of(
                new Segment(1, "desert", List.of("desert"))
            )));

        var service = new CoordinatorService(coordinator, locationFinder);
        var result = service.parseAndFindAll("desert vibes");

        assertThat(result).hasSize(1);
    }
}
```

For the hackathon, integration test the happy path against the real API once (in `@Tag("integration")`) and skip unit tests. The risk surface is small.

### Manual testing via Swagger

Since you have `springdoc-openapi-starter-webmvc-ui`, hit `http://localhost:8080/swagger-ui.html` to manually fire your endpoints. Fastest feedback loop.

---

## 14. End-to-end project shape

### Call graph: `POST /api/trip/parse`

```
HTTP POST /api/trip/parse
    body: { "prompt": "..." }
    ↓
TripController.parse(request)
    ↓
CoordinatorService.parseAndFindAll(prompt)
    │
    ├─ 1. coordinator.prompt().user(prompt).call().entity(ParsedSegments.class)
    │       → ParsedSegments { segments: [...] } (sequential, ~1-2s)
    │
    ├─ 2. For each segment, async call to LocationFinderService.findForSegment(segment)
    │       → N parallel CompletableFuture<MatchedLocations>
    │
    ├─ 3. CompletableFuture.allOf(...).join() — wait for slowest
    │
    └─ 4. Return Map<Integer, MatchedLocations>
    ↓
Controller serializes to JSON → frontend
```

### Call graph: `POST /api/trip/plan`

```
HTTP POST /api/trip/plan
    body: { departureDate, homeAirport, legs: [...] }
    ↓
TripPlannerService.plan(request)
    │
    ├─ 1. Calculate timeline (pure Java, no LLM, no API)
    │       homeAirport → leg1.airport (depart)
    │       leg1.airport (stay N days) → leg2.airport
    │       ...
    │       lastLeg.airport → homeAirport (return)
    │
    ├─ 2. Parallel (all three concurrent):
    │       ├─ DuffelClient.searchMultiCityFlights(slices)
    │       ├─ For each leg: DuffelClient.searchStays(lat, lng, dates)  [or mock]
    │       └─ For each leg: sitesRecommender.prompt(template).entity(List.class)
    │
    └─ 3. Assemble TripPlanResponse with legs + return flight
    ↓
Controller → frontend
```

### Package layout

```
com.abdullah.api/
├── Main.java                          @SpringBootApplication @EnableAsync
├── config/
│   ├── AgentConfig.java               3 ChatClient @Bean methods
│   ├── DuffelConfig.java              RestClient bean for Duffel
│   ├── CorsConfig.java                CORS for Next.js frontend
│   └── AsyncConfig.java               (optional) thread pool tuning
├── controller/
│   ├── TripController.java            POST /api/trip/parse, /plan, GET /health
│   └── DuffelTestController.java      Throwaway dev endpoints under /dev/duffel/*
├── service/
│   ├── CoordinatorService.java        parseAndFindAll: Coordinator + fanout
│   ├── LocationFinderService.java     @Async per segment
│   ├── SitesRecommenderService.java   Per-location attractions
│   ├── TimelineCalculator.java        Pure logic: dates per leg
│   ├── TripPlannerService.java        Orchestrates flights + stays + sites
│   └── OfferMapper.java               Duffel offer → frontend AirlineOption
├── client/
│   └── DuffelClient.java              Wraps RestClient calls to Duffel
└── model/
    ├── prompt/
    │   ├── ParsedSegments.java
    │   └── MatchedLocations.java
    ├── trip/
    │   ├── TripPlanRequest.java
    │   ├── TripPlanResponse.java
    │   └── Leg.java
    └── duffel/
        ├── OfferRequestPayload.java
        └── OfferRequestResponse.java
```

---

## 15. What to skip for the hackathon

These are interesting but **not on the critical path**:

| Feature | Why skip |
|---------|----------|
| **Function/Tool calling** | Your agents return JSON, your backend calls Duffel. The LLM doesn't need to invoke functions itself. |
| **RAG / VectorStore / Embeddings** | You have no document corpus. Your "knowledge" is the LLM's training data. |
| **ChatMemory** | Every agent call is stateless one-shot. No multi-turn conversations. |
| **Advisors API** | Overkill for 3 specialized agents. Use plain `defaultSystem`. |
| **MCP (Model Context Protocol)** | No external tool servers needed. |
| **`spring-ai-agent-utils` Orchestrator-Workers** | Plain `CompletableFuture` is simpler and gives the same effect. |
| **Streaming responses** | Nice-to-have for the agent console; fake it with backend log events via SSE instead. |
| **Image/audio modalities** | Pure text in, pure text out. |
| **Multiple LLM providers** | Remove the OpenAI starter. Anthropic-only. |

If you finish early, the first thing to add back is **streaming for the agent console** — it's the visual centerpiece.

---

## 16. Reading order — official docs

Order to read tonight:

1. **Concepts** — https://docs.spring.io/spring-ai/reference/concepts.html (15 min, sets vocabulary)
2. **ChatClient API** — https://docs.spring.io/spring-ai/reference/api/chatclient.html (30 min, the meat)
3. **Structured Output** — https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html (20 min, bread and butter)
4. **Prompt** — https://docs.spring.io/spring-ai/reference/api/prompt.html (10 min, templates + roles)
5. **Anthropic Chat** — https://docs.spring.io/spring-ai/reference/api/chat/anthropic-chat.html (15 min, provider specifics)
6. **Spring `@Async` reference** — https://docs.spring.io/spring-framework/reference/integration/scheduling.html (10 min, parallelism)

Total: ~1.5 hours of focused reading.

### Bonus reading if you want deeper

- **Effective agents pattern** — https://docs.spring.io/spring-ai/reference/api/effective-agents.html
- **Baeldung agentic patterns** — https://www.baeldung.com/spring-ai-building-effective-agents
- **Spring AI GitHub** — https://github.com/spring-projects/spring-ai
- **Anthropic Claude docs** — https://docs.claude.com/en/docs/intro

---

## 17. Cheat sheet

The minimum you need in working memory:

### Inject a chat client
```java
public MyService(@Qualifier("agentName") ChatClient client) { ... }
```

### Make a call returning text
```java
String text = client.prompt().user("...").call().content();
```

### Make a call returning a typed object
```java
MyRecord result = client.prompt().user("...").call().entity(MyRecord.class);
```

### Make a call returning a typed list
```java
List<String> list = client.prompt().user("...").call()
    .entity(new ParameterizedTypeReference<List<String>>() {});
```

### Configure an agent bean
```java
@Bean
ChatClient myAgent(ChatClient.Builder b) {
    return b.defaultSystem("...").defaultOptions(
        AnthropicChatOptions.builder().model("claude-opus-4-7").temperature(0.3).build()
    ).build();
}
```

### Run N agents in parallel
```java
@Async
public CompletableFuture<X> run(Y input) { ... return CompletableFuture.completedFuture(...); }

List<CompletableFuture<X>> futures = inputs.stream().map(this::run).toList();
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
List<X> results = futures.stream().map(CompletableFuture::join).toList();
```

### Parameterize a prompt
```java
client.prompt()
    .user(u -> u.text("Hello {name}").param("name", "world"))
    .call().content();
```

### Always wrap entity calls
```java
try {
    return client.prompt().user(...).call().entity(MyRecord.class);
} catch (Exception e) {
    log.error("LLM call failed", e);
    return /* fallback */;
}
```

That's the whole curriculum for what you'll write.