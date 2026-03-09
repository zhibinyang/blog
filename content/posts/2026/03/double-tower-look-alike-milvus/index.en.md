---
title: "Breaking the ID Myth: Rebuilding a Dual-Tower Look-alike System with Milvus and Gemini"
date: 2026-03-09T09:00:00+08:00
tags:
- machine-learning
- data-science
- adtech
- vector-database
categories:
- data-science
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> In the relentless currents of mobile marketing, finding the "right people" is always the ultimate pursuit. However, as traditional ID matching gradually fails amidst privacy protections and data fragmentation, simply relying on historical clicks to ring-fence Look-alike audiences is no longer enough. We must strip away the superficial data and dig deep into the dual resonance of behavioral intent and semantic understanding. This post will take you beyond conventional thinking, providing a hardcore retrospective on how to leverage LLMs and vector models to extract truly high-value "digital twins" from a sea of noise.

<!--more-->

![Cover Image](assets/cover.jpg)

In the hierarchy of ad optimization systems, there are always those who believe that simply pouring data into a Large Language Model will magically yield high-value users.

What's the reality? Real-world mobile click data is never a neatly organized textbook. It consists of fragmented snapshots and a massive pool of noise filled with accidental device touches and low-quality sampling points. Today, as traffic becomes increasingly expensive and acquisition costs soar, if your Look-alike system is still stuck on mechanical Device ID matching or merely drawing circles based on statistical probabilities, you are destined to only pick up the scraps left behind by others.

This time, I decided to abandon the traditional route. I wanted to build a bidirectional retrieval engine capable of simultaneously gleaning **Behavioral intent** and **Semantic understanding**. This is the full chronicle of exploring a dual-tower Look-alike system based on **BigQuery + App2Vec + Gemini + Milvus**.

## Phase 1: Spatiotemporal Mining — Reconstructing the "Intent Stream" in the Cloud

The starting point of our exploration was a massive raw log dataset (TalkingData) exceeding hundreds of millions of records. This raw data was full of redundancy, like shattered frosted glass.

### Core Insight: Compute Pushdown & Event-Level Compression

When dealing with such data, the biggest mistake is dragging all the noise directly to local machines for brute-force processing. I pushed the computation logic down to **BigQuery**. This wasn't just to accelerate standard `JOIN` operations; the core was engineering an **"Event-level Basket Compression"** algorithm:

*   **State Deduplication:** Identifying "background activity" among consecutive sampling points and retaining only the key nodes where the intent substantially changes (e.g., a change in the members of the active App basket).
*   **Temporal Alignment:** Utilizing advanced computations similar to `ARRAY_AGG` to guarantee strict chronological order of behavioral trajectories, reconstructing fragmented, massive logs into continuous, smooth "intent streams."

**The Technical Baseline:** Top-tier algorithms always begin with clean data. Solving noise at the distributed SQL level yields an ROI far exceeding fighting overfitting at the model level.

## Phase 2: The Behavioral Tower — An "Linguistics" Experiment with App2Vec

After purifying the data, how do we profile a person? If we view a user's sequence of App usage as a sentence, then the Apps are the words within this intent stream.

### App2Vec: Capturing Subconscious Preferences

Leveraging the **Word2Vec (Skip-gram)** architecture, I began constructing the user's behavioral trajectory. While not a novel concept, the devil is in the details of how we handle feature aggregation.

Once the model learns the "co-occurrence" patterns between independent App IDs, we cannot simply sum and average them. To generate a user vector that represents the current business reality, the system must introduce the concept of **Time-decay Pooling**:

$$V_{user} = \frac{\sum (V_{app\_i} \times W_{recency})}{\sum W_{recency}}$$

The closer a behavior is to the present, the higher its weight $W_{recency}$. This gives our 128-dimensional behavioral vector not only the depth to profile long-term characteristics but also a hyper-sensitivity to immediate intent.

## Phase 3: The Semantic Tower — "Industry Common Sense" Endowed by LLMs

However, models purely based on behavioral co-occurrence suffer from a fatal physical law: **Cold Start blindness**.

When encountering a new App with no historical behavior records, or a new user who just entered the system, the Skip-gram network has no edges to connect, causing the system to miscalculate instantly at this node.

### A Dimensional Strike from ID to Meaning

To break through this barrier, I introduced **Gemini Embedding** to construct an independent semantic trajectory.

*   **Semantic Anchoring:** Associating a anonymized list of users with the underlying industry tags they have touched (e.g., `finance`, `wealth_management`, `game_strategy`).
*   **Common Sense Alignment:** The system feeds these discrete sequences of stacked strings into the `gemini-embedding-001` model. Relying on its vast pre-trained understanding, Gemini maps the dry classifications into a 768-dimensional vector rich in "human common sense."

This means that even if two Apps have never been clicked by the same user, as long as their underlying commercial semantics are similar, the system can seamlessly draw their relative audiences closer in the vector space. This is the dimensional strike brought by large models.

## Phase 4: The Vector Port — The "Late Fusion" Magic of Milvus

With precise 128-dimensional behavioral vectors and intelligent 768-dimensional semantic vectors, the real challenge arrives: how do we make these two distinct feature towers, with completely different dimensions, work together?

I decisively abandoned the highly rigid old method of "static concatenation (Concat)" fed into a fully connected layer. I opted for the flexible **Milvus multi-vector architecture** and implemented a hardcore **application-layer Late Fusion**.

### Discarding the Black Box: Manually Building a Dual-Track "Mixing Console"

Although some vector databases have introduced native hybrid search in their iterative updates, in real-world industrial-grade ad systems, experienced architects often choose to **implement hybrid search manually** to maintain absolute control over the recall and re-ranking mechanisms.

In our architectural design, the user's behavioral `behavior_vec` and semantic `semantic_vec` are independently constructed as two parallel HNSW index columns. The engineering significance of this is: **complete dynamic decoupling and highly controllable weight adjustment during queries**.

When a request comes in, our code initiates fast concurrent searches to both vector towers, expanding the recall multiplier (Top $K \times 2$) to populate the candidate pool. Subsequently, within an in-memory dictionary at the application layer, we perform brute-force alignment and merging of scores for this massive batch of candidate IDs.

Imagine a precision mixing console in front of you: at the very moment data converges, the system can freely tweak the main control knobs, $\alpha$ and $\beta$, based on the advertiser's current campaign goals (KPIs), calculating the final priority score in real-time based on a custom formula:

$$Final\_Score = \alpha \times Score_{behavior} + \beta \times Score_{semantic}$$

*   **Precision Harvesting Mode ($\alpha=0.8, \beta=0.2$):** The system heavily prioritizes the tight fit of behavioral sequences. The resulting users exhibit remarkably high Jaccard overlap in App usage, ideal for ROI sprints with high conversion rates.
*   **Brand Expansion Mode ($\alpha=0.2, \beta=0.8$):** The system shifts to follow Gemini's semantic advice, excavating potential audiences who strongly align with the underlying tag semantics, even if they have never used related competing products, achieving excellent market penetration.

```python
def hybrid_search(collection, query_behavior_vec, query_semantic_vec, alpha=0.5, beta=0.5, top_k=10):
    # 1. Behavioral Domain Recall (Behavior Tower)
    behavior_results = collection.search(
        data=[query_behavior_vec],
        anns_field="behavior_vec",
        param={"metric_type": "COSINE", "params": {"ef": 128}},
        limit=top_k * 2,  # Expand the recall pool
        output_fields=["device_id"]
    )

    # 2. Semantic Domain Recall (Semantic Tower)
    semantic_results = collection.search(
        data=[query_semantic_vec],
        anns_field="semantic_vec",
        param={"metric_type": "COSINE", "params": {"ef": 128}},
        limit=top_k * 2,
        output_fields=["device_id"]
    )

    # 3. Late Fusion & Formula-based Re-ranking
    device_scores = {}
    
    # ... Extract scores separately and merge them into the device_scores dictionary ...

    final_results = []
    for device_id, scores in device_scores.items():
        # Core: Calculate the fusion score in real-time based on the alpha and beta sent from the frontend
        final_score = alpha * scores.get('behavior', 0) + beta * scores.get('semantic', 0)
        final_results.append((device_id, final_score))

    # Sort descending by final score, slice Top K to expose to the advertiser
    final_results.sort(key=lambda x: x[1], reverse=True)
    return final_results[:top_k]
```

## Exploratory Conclusion: Empirical Evidence that 1 + 1 > 2

This is by no means an armchair theory. During a full regression test on a 10MB sampled dataset, I extracted a high-net-worth financial seed customer whose tags included `consumer_loans`, `wealth_management`, `im`, and `game` (across 53 tags) for a retrieval test.

Upon executing an equal-ratio fusion of $\alpha=0.5, \beta=0.5$, astonishing results emerged. The Top 10 users recalled by this system not only accurately identified high-scoring users who excelled in both behavior and semantics but also revealed, in a highly complementary fashion, two demographics abandoned by single-tower models:
1. **High-potential prospects with explicit intent** (extremely high semantic match > 0.92, but virtually zero behavioral sequence overlap, hence ignored by traditional models).
2. **Pure action replicators** (highly similar action streams, but possibly just low-activity accounts that rarely generate tags).

Quantitatively, the average tag overlap (Jaccard) between the seed demographic and the recalled demographic steadily climbed to **60%-80%**, demonstrating a business potential far exceeding that of a random macro-pool!

## Conclusion

This end-to-end rebuild—from data cleaning and dual-tower mapping to the final multi-vector retrieval—is not just a tear-down of underlying infrastructure but a profound homage to the concept of the "digital twin." A true Look-alike should never be a cold ID clone. What we need is a perfect synchronization of **human business intent** (Behavior) and **world common sense logic** (Semantic) within a multi-dimensional, high-dimensional vector space.
