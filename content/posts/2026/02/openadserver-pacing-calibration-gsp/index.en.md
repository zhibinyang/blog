---
title: "From Barebones to Fully Furnished: Building the Pacing Engine and Real-Time Calibration Layer in My OpenAdServer"
date: 2026-02-21T18:10:00+08:00
tags:
- adtech
- system-design
- bidding
- machine-learning
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> When OpenAdServer supported oCPM and CPA billing, uncontrollable budget burn became a ticking time bomb. During the system rewrite from Python to Node.js, the Pacing module was completely "barebones," featuring only basic Daily Cap and Flight Cap. To prevent advertisers' budgets from being instantly depleted by low-quality traffic within minutes, I injected multiple pacing strategies such as second-level EVEN, Aggressive, and Evergreen. Meanwhile, to tackle the issue of inaccurate early-stage deep learning models that often led to sky-high eCPMs, I adopted Generalized Second-Price (GSP) coupled with a "real-time calibration layer" based on 24-hour feedback, forcibly smoothing the budget consumption curve through engineering.

<!--more-->

![Pacing and Calibration Engine](assets/cover.jpg)

## 1. Budget Feedback Loop and Diverse Pacing Strategies

For an AdServer to function properly in production, merely selecting the right ad is not enough; you must manage the advertiser's money tightly. The initially refactored version had extremely rudimentary Pacing—it essentially only knew "stop when the money is gone."

In this upgrade, I redesigned the state machine for Pacing. All pacing budgets and frequency states are now cached in Redis, and I exposed a dedicated API, allowing me to glean the real-time spending rhythm of each Campaign instantly. More importantly, I connected the tracking pipeline: the system now accurately records the `cost` info during Impression, Click, and Conversion pixel calls, and writes it back to the Redis budget buckets in real-time, forming a truly closed-loop financial flow.

Based on this high-frequency infrastructure, I completed five Pacing modes:

*   **EVEN**: By tracking the percentage of the current day that has passed (e.g., 50% at 12 PM), it restricts the campaign's budget consumption from significantly exceeding this ratio. I added a tiny 2% buffer. If the spending speed outpaces time progress, requests are dropped via non-linear probabilities.
*   **Aggressive**: Allows spending a bit more in the morning (up to 130% of time progress) to seize premium traffic early on, coasting to a slower speed in the afternoon and evening.
*   **Daily ASAP**: As long as today's Daily Cap hasn't been hit, it aggressively spends for impressions.
*   **Flight ASAP**: Ignores daily limits entirely and sprints at full speed throughout the campaign's overall flight.
*   **Evergreen**: Ignores all budget caps and frequency limits. It acts as a safety net, forever competing for the residual, leftover traffic in the system.

## 2. Introducing GSP to Tame the oCPM Budget Pool

When I first launched the pCVR model for oCPM bidding, I noticed a terrifying phenomenon: the budget was draining absurdly fast!

Because the early-stage deep learning model (DeepFM) hadn't digested enough data, it often exhibited blind overconfidence regarding the predicted conversion rate (pCVR). An advertiser might set a reasonable CPA target bid, but when multiplied by a wildly overestimated pCVR and pCTR, the calculated eCPM could skyrocket to hundreds of dollars. Under a First-Price Auction mechanism, the system would charge this astronomical price directly, emptying the advertiser's account in minutes.

Therefore, introducing the **Generalized Second-Price (GSP)** mechanism became an absolute necessity. In the current scoring engine, the advertiser ranked first ultimately pays just slightly more than what's needed to beat the second place. Even if the model overestimates pCVR causing eCPM to hit the roof, GSP suppresses the final `actual_cost` into an extremely smooth and reasonable range. This isn't just about being "fair to the advertiser"; it's a lifesaver for maintaining ecosystem stability.

## 3. The "Real-Time Calibration Layer" for Model Fluctuations

Given that large deep learning models are prone to overestimation/underestimation biases, could we take action on the prediction side in addition to relying on GSP for billing? After all, traffic surges can happen anytime.

To address this, I designed a purely engineering-focused **Real-Time Model Calibration Layer**.

The logic is very pragmatic: I utilize a Hash structure in Redis with a 48-hour expiration to ingeniously maintain a **native 24-hour sliding window**. Every time an ad gets an impression, I accumulate its pCTR (expected clicks); every time an actual click occurs, I accumulate `actual_clicks` and stuff in its pCVR (expected conversions). When a real conversion arrives, I log `actual_convs`.

During the retrieval and ranking phase, the system fetches this 24-hour ratio in real time to calculate two calibration factors:
*   `ctr_factor` = (actual clicks + 10) / (expected clicks + 10)
*   `cvr_factor` = (actual conversions + 10) / (expected conversions + 10)

*(The +10 smoothing value prevents division-by-zero errors and severe volatility during the cold-start phase.)*

The system takes the absolute pCTR and pCVR inferred by the AI model, multiplies them by these real-time tuned factors, and then feeds them into the auction engine. **If the model has been too optimistic over the past day, the system aggressively suppresses it with a multiplier `< 1`; if performance is surprisingly good, the model receives a reward multiplier up to `2.0x`.**

This creates a soft buffer zone between the pacing system and the ML models. Whether faced with sudden pulse-like traffic changes or initially unsophisticated AI algorithms, the system can quickly adapt and converge within an hour, truly demonstrating the robust composure a commercial AdServer engine should possess.

{{ github-link link="https://github.com/zhibinyang/openadserver-node" text="View on Github" }}