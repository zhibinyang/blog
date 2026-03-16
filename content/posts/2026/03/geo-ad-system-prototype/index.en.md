---
title: "After the 3·15 Exposé, I Built a GEO Ad System in Half a Day"
date: 2026-03-16T19:00:00+08:00
tags:
- generative-ai
- adtech
- geo
categories:
- ai
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> CCTV's 3·15 Consumer Rights Gala just put a spotlight on a shady practice called GEO (Generative Engine Optimization)—flooding AI models with fabricated content to turn hallucinated products into "recommended answers." I happened to have an idle OpenAdServer open-source ad serving framework sitting around, so I spent half a day running through the GEO logic from scratch to understand exactly how this gray-market pipeline works.

<!--more-->

![Cover](assets/cover.jpg)

This year's 3·15 Gala turned its spotlight on a term most people haven't heard of yet: **GEO (Generative Engine Optimization)**. The show demonstrated a disturbing experiment: a completely fictional product called "Apollo-9 Smart Bracelet" was fed into dozens of sponsored articles, and within two hours, AI models had classified it as a credible source, ranking it prominently in responses to queries like "recommend a smart health wristband"—complete with fabricated features like "quantum entanglement sensing."

Unlike traditional SEO, which manipulates search page rankings, GEO's goal is to plant commercial payloads inside the retrieval corpus that AI systems draw from, getting LLMs to organically speak for advertisers in natural conversation. From a technical standpoint, it's the side effect of vector retrieval + LLM inference being deliberately exploited.

Now that the pipeline is clear, there's only one thing to do: build it myself.

## What GEO Advertising Actually Is Technically

In technical terms, the legitimate form of GEO advertising (essentially RAG-based ad serving) is straightforward:

1. An advertiser uploads a **knowledge snippet** about their product—think a carefully written product description.
2. The platform **embeds** this text via an embedding model and stores it in a vector database.
3. When a user asks a question, the system embeds the query and retrieves the **semantically closest** ad content from the vector store.
4. These candidates are sent to an **LLM for scoring**, which judges whether they can naturally flow into a conversational answer.
5. The highest-scoring ad content is **injected into the final LLM response prompt**.

Unlike traditional CPM/CPC billing per impression or click, GEO billing is measured in "relevance hits" (Impressions/Mentions), which is a far better fit for conversational products.

What 3·15 criticized is that bad actors used this technology for false content, polluting the open web's crawled corpus rather than running inside a controlled platform. This is a gray-area path any technology can stumble into—understanding how it works is the first line of defense.

## Implementing the GEO Pipeline on OpenAdServer

I had an idle `openadserver-node` open-source ad serving framework on hand, originally running CPM/OCPM auction ads. The plan for GEO was simple: **build a completely separate GEO Pipeline alongside the existing one, with zero interference between them**.

### Architecture Overview

Technology choices for the new GEO pipeline:

*   **Vector Database**: Milvus Standalone (running locally via Docker Compose, backed by etcd + MinIO)
*   **Embedding Model**: `gemini-embedding-001` (3072 dimensions, via `@google/genai` SDK)
*   **Scoring Model**: `gemini-3.1-flash-lite-preview` (lightweight, scoring the top 3 candidates individually)
*   **Retrieval Service**: `GeoRetrievalService`, closing the full loop: "vector search → filter → AI scoring → rank"

### Key Data Structure

A new `geo_knowledge` table was added to the database to store advertiser knowledge snippets:

*   `advertiser_id`, `campaign_id`, `creative_id`: Bind each snippet precisely to a delivery unit
*   `content`: The actual text of the knowledge snippet (the ad copy the advertiser wrote)
*   `embedding_status`: `pending → indexed → error`, tracks the vectorization state
*   `milvus_pk`: The primary key of the corresponding vector in Milvus, back-filled after indexing

An extra `brand_weight` field (default 1.0) was added to the `advertisers` table to apply per-advertiser weighting to the final ranking score.

### Retrieval Pipeline Flow

When a GEO ad request comes in, `GeoRetrievalService` does the following:

1. Convert the user's query text into a vector via `EmbeddingService`
2. Run a Top-50 approximate nearest neighbor search in Milvus using that vector
3. Hydrate Campaign/Creative info from cache via `creative_id`
4. Reuse the existing `FilterService` to filter out budget-exhausted or inactive campaigns
5. For the top 3 candidates, call `GeoScoringService` to ask Gemini for a 0-1 "naturalness score"
6. Final score = `geo_score × 0.4 + relevance_score × 0.3 + ecpm_normalized × 0.3`, multiplied by `brand_weight`

The scoring prompt is blunt: *"You are an ad content reviewer. Judge whether the following knowledge snippet can naturally answer the user's question. Return only a number between 0 and 1."*

A new `POST /ad/geo` endpoint was added alongside the existing `/ad/get` and `/ad/vast` endpoints, with no impact on existing ad logic whatsoever.

### Admin UI

A new Knowledge management page (List + Form) was added to `openadserver-ui`, supporting:

*   Creating knowledge snippets linked to a Campaign
*   Monitoring `embedding_status`—once submitted, the backend calls Gemini Embedding, upserts the result to Milvus, and updates the status to `indexed`
*   Filtering and editing entries

## Client-Side: Ad Injection Testing with an AI Chat App

The backend alone isn't intuitive enough. So I spent under an hour building a minimal AI chat Demo App using Vue 3 + Vuetify 4 + Gemini SDK, specifically to test how ads should be injected at the conversational layer.

### Two Ad Modes

The app supports switching between two ad injection modes:

*   **Non-native mode**: The AI responds to the user normally; an independent ad card is appended at the end of the answer, clearly labeled with brand and source link.
*   **Native mode**: Key ad content is naturally woven into the AI's recommendation text, with a low-key `[Learn More | link]` line at the very end.

Whether to insert an ad in the first place goes through an "intent detection" pass: a lightweight Gemini model judges whether the user is asking a "multi-option recommendation" question (e.g., "recommend a few..."). If so, the ad pipeline is triggered; otherwise, the query goes directly to a clean LLM response with no ads.

### Four Test Scenarios

Two ad creatives were seeded into the system:

*   A **children's board game** targeting ages 3-8, positioned around cognitive development
*   **Children's modeling clay** that supports multi-shape and color-mixing, marketed as non-toxic and safe

**Scenario 1: Children's Board Game Recommendation (Non-native mode)**

Query: "Any board game recommendations for a 4-year-old?"

The AI gave a normal multi-option recommendation, with an independent ad card appearing at the end of the response clearly showing its ad identity.

![non-native](assets/non-native.jpg)

**Scenario 2: Children's Modeling Clay Recommendation (Native mode)**

Query: "I want to get some craft supplies for my kid—which modeling clay is good?"

In native mode, the AI naturally mentioned the advertised product while discussing non-toxic materials; the paragraph flows smoothly, with a standalone "Learn More" link on the final line.

![native](assets/native.jpg)

**Scenario 3: Beijing Street Food (Ad pipeline triggered, but no matching creatives)**

Query: "In 200 words, what are the must-try street foods in Beijing?"

Intent detection classified this as a "multi-option recommendation" query, triggering the ad pipeline and sending a retrieval request to `/ad/geo`. But since the only inventory consists of children's board games and clay, the semantic vector distance was too great—no candidates passed the scoring threshold. The ad pipeline returned empty, and the AI answered as usual with no ads. This scenario shows the pipeline's built-in relevance floor: if inventory isn't relevant, don't serve it, never force it.

![no-ad](assets/no-ad.jpg)

**Scenario 4: What Medicine to Take for a Cold (Intent detection blocks, ad pipeline never triggered)**

Query: "Briefly tell me what medicine to take for a cold."

Intent detection flagged this as a sensitive medical consultation question. It bypassed the ad pipeline entirely. The AI gave a concise medication suggestion with no ad logic involved at any point.

![no-intent](assets/cannot-deliver.jpg)

## A Few Observations

**1. Intent detection is the most fragile link in the whole chain**

Running a dedicated Gemini call for intent classification adds an extra round-trip of LLM latency. If intent detection misfires—mistaking a navigation question for a product recommendation query—the user experience degrades noticeably. In a production setting, this layer would likely need to be replaced by a lighter, lower-latency classifier.

**2. Native ads can easily cross the line**

During testing, when an ad's knowledge snippet copy was written too "salesy," the paragraph Gemini generated was noticeably stiffer, and the tonal shift would be detectable to any reader who's been around the block. The core challenge of GEO advertising isn't technical—it's finding a genuine balance between "information that's useful to the user" and "what the advertiser wants to push."

**3. Transparency is the only thing that legitimizes this system**

GEO advertising technology is not inherently wrong. What 3·15 rightfully criticized is that gray-market players exploit the AI's trust propagation mechanism—disguising commercial content as objective fact with zero ad labels. As long as the ad identity is clearly disclosed to the user (whether as a card, an "includes sponsored info" badge, or anything else visible), this technology returns to a reasonably fair position for advertisers, platforms, and users alike.

## Conclusion

From when the show aired to getting this tech stack running in a working prototype—about half a day. The technical barrier for GEO advertising isn't high; the underlying vector retrieval and embedding capabilities are fully commoditized and SDK-ified now. What truly determines where this technology goes is whether the people building it are willing to let users know they're looking at an ad.
