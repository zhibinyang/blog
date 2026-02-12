---
title: "Hand-crafting an Ad Engine: Why Tech Giants Love the \"Funnel\" Architecture"
date: 2026-02-01T22:25:03+08:00
draft: false
tags:
- adtech
- architecture
- openadserver
- nestjs
categories:
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> To push forward my [2026 AdTech Sandbox]({{< ref "posts/2026/01/adtech-sandbox-2026" >}}) plan and build a full-stack digital marketing experimental environment, I recently started dismantling the open-source project OpenAdServer.
>
> My goal was to refactor this legacy Python project into a NestJS version to serve as the core ad engine in my Sandbox. I thought it would be a simple "language translation" job—changing Python's snake_case to TypeScript's camelCase, and swapping Flask for NestJS modules.
>
> But when I reached the `src/modules/engine/pipeline` directory, I suddenly realized I was re-inventing a classic architecture.
>
> The logic that was originally scattered across various files—fetching data from cache, checking budgets, calculating CTR, ranking—when I organized them sequentially into 5 NestJS Services, a standard, textbook "Funnel Architecture" emerged.
>
> This post won't dwell on specific code syntax. Instead, let's talk about why, on this planet, almost every mainstream ad engine (whether it's Google, Meta, or ByteDance) looks exactly like this.

![cover](assets/cover.jpg)

## The "Impossible Triangle" of Compute & The Birth of the Funnel

Imagine you are an ad platform, receiving hundreds of thousands of requests per second. Lying in your database are millions, perhaps tens of millions, of ad creatives.

**What is the perfect scenario?**
For every single request, we pull out all ten million ads from the database, run each one through the most complex deep learning model to precisely calculate the probability of this user clicking (pCTR) and converting (pCVR), then calculate the eCPM, sort them, and pick the best one.

**But physically, this is impossible.**
*   **Too many candidates**: Ten million ads.
*   **Models are too slow**: A complex DNN model might take a few milliseconds for one prediction.
*   **Response must be fast**: A user's patience for page loading is only about 100~200 milliseconds.

Covering full data, using complex models for precise estimation, and returning results in milliseconds—this is an "Impossible Triangle."

To solve this, smart engineers invented the **"Funnel Model."** Since we can't perform fine-grained calculations on all ads, we process them in stages: **At the start, when there are many candidates, use simple rules to filter quickly; as we go deeper and candidates become fewer, use complex models for precise calculations.**

In my refactored code, this funnel is clearly decomposed into 5 steps.

## 1. Retrieval: Broad and Fast

**Industry Term**: Recall / Retrieval
**Code Implementation**: `1-retrieval.service.ts`

This is the mouth of the funnel. At this stage, our goal is not "precision," but "speed" and "comprehensiveness."

You need to quickly identify a few thousand potentially relevant ads from a library of millions. Although my code currently uses simple cache queries, in a real production environment, this usually corresponds to an **Inverted Index** or the currently popular **Vector Search (ANN)**.

At this point, you can't use complex models; even a database `LIKE` query is too slow. We use a TargetingMatcher to check user profiles, keeping only those ads that are "logically possible."

*   **Input**: 10,000,000+ candidates
*   **Output**: ~1,000 candidates

## 2. Filter: The Veto Power

**Industry Term**: Hard Filtering
**Code Implementation**: `2-filter.service.ts`

Some rules are non-negotiable.
For instance, has the advertiser's budget run out? (Budget Check)
Has this user seen this advertisement too many times today? (Frequency Capping)

These checks must be "hard" constraints. No matter how attractive an ad is, if there's no money left or it violates a rule, it must be kicked out immediately. In this stage, I use Redis Pipeline for parallel processing to quickly weed out invalid candidates.

*   **Input**: ~1,000 candidates
*   **Output**: ~500 candidates

## 3. Prediction: Burning Compute

**Industry Term**: Scoring / Inference
**Code Implementation**: `3-prediction.service.ts`

By now, we're down to a few hundred candidates. Finally, we can bring out the "heavy artillery."
This is where the engine consumes the most computing power. We need to estimate two core probabilities:
1.  **pCTR (Predicted Click-Through Rate)**: The probability that the user will click.
2.  **pCVR (Predicted Conversion Rate)**: The probability that the user will buy after clicking.

In my toy code, this is currently a simulation (added some random noise). But in a production environment, this is where ONNX Runtime or TensorFlow Serving typically comes in, running massive deep learning models like DeepFM or DIN.

*   **Input**: ~500 candidates
*   **Output**: 500 scored candidates

## 4. Ranking: Money and Game Theory

**Industry Term**: Auction / Ranking
**Code Implementation**: `4-ranking.service.ts`

Now that we have the probabilities, how do we decide who comes first?
This involves the core business logic of advertising—**eCPM (effective Cost Per Mille)**, the expected revenue per thousand impressions.

Different advertisers have different bidding models:
*   **CPM**: I pay for impressions; the advertiser bears the risk.
*   **CPC**: I pay for clicks; the platform estimates pCTR and bears the risk of impressions without clicks.
*   **oCPM**: I pay for conversions; the platform estimates pCVR and bears more risk.

The core of the ranking code is to use the formula $eCPM = Bid \times pCTR \times pCVR$ to bring these different models onto the same dimension, allowing them to compete fairly through "spending power" and "quality."

This is also the battlefield of Game Theory and Mechanism Design, where theories like VCG Auction and GSP Auction are put into practice.

*   **Input**: 500 scored candidates
*   **Output**: List sorted by eCPM

## 5. Rerank: The Big Picture

**Industry Term**: Re-ranking
**Code Implementation**: `5-rerank.service.ts`

If you sort strictly by eCPM, you might run into a problem: The Top 10 ads might all belong to the same wealthy advertiser. This sucks for user experience and hurts the platform's long-term ecosystem.

So, we need a final "adjustment."
My code here implements **Diversity Control** (at most 2 ads from the same advertiser) and **Truncation** (returning only the Top 10). In more complex systems, algorithms like MMR (Maximal Marginal Relevance) would be added here to diversify recommendations while maintaining revenue.

*   **Input**: Sorted list
*   **Output**: Final Top 10

## Conclusion

This refactoring made me deeply appreciate that so-called "architecture" is often not dreamed up in isolation but "forced" into existence by real-world constraints.

The funnel architecture of an ad engine is the **optimal solution** found between massive data (Retrieval), business constraints (Filter), precise estimation (Prediction), commercial monetization (Ranking), and ecosystem health (Rerank).

Looking at those files under `src/modules/engine/pipeline`, I feel like I'm not just seeing TypeScript code, but the crystallized wisdom of the computational advertising industry over the past few decades.

Next step: I plan to replace the random number generator in `Prediction` with a real ONNX model. The skeleton is built; now it's time to give it a soul.
