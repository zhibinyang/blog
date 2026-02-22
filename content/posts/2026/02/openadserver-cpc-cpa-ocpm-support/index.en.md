---
title: "The Evolution of Traffic Billing: From Flat-Rate CPM to Performance-Driven oCPM, Upgrading My OpenAdServer Engine"
date: 2026-02-21T16:00:00+08:00
tags:
- adtech
- machine-learning
- bidding
- system-design
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> Over the past two days, I did a deep dive into my "bare-bones" OpenAdServer. It has grown from only supporting a single CPM mode when I first refactored it back to Node.js, to now smoothly supporting CPC, CPA, and even oCPM! This breakthrough was driven by continuous stress-testing with the PulseSim simulator and the successful training of pCTR and pCVR models. Not only did I introduce the Generalized Second-Price (GSP) auction mechanism in the ranking phase, but I also injected the predicted scores directly into the ad event logs at the foundation level. Today, let's break down this architectural upgrade from "flat-rate" to "performance-driven", and discuss the underlying conflicts of interest behind these four billing models from the perspectives of advertisers, publishers, and the ad platform.

<!--more-->

![OpenAdServer Bidding Engine](assets/cover.jpg)

## 1. Setting the Stage: Polishing PulseSim and the Birth of Models

Previously, my OpenAdServer only had a single, pitiful CPM Campaign. To get the system truly running, I spent a lot of time tuning the traffic simulator, **PulseSim**.

I added a few fixed `slot_id`s (ad placements) to the simulator and forcibly coupled them with click and conversion rate multipliers according to their position. This not only simulated real-world physics where a "Homepage Banner outperforms a Footer," but also gave the generated data distinct, recognizable patterns.

With this slightly higher-quality data, I embarked on iterative feature engineering:
* **Sparse vs. Dense**: I ran multiple experiments. The most significant change was discarding the approach of treating `banner_width` and `banner_height` directly as Dense continuous features. Instead, I concatenated them into a single `size` string (e.g., `320x50`) and moved them into the Sparse discrete feature group for Embedding.
* **Reusing BigQuery**: During the feature retrieval phase, I adopted a strategy of querying all sample features at once and then filtering them in-memory, which greatly reduced query latency.

After this combination of punches, the trained DeepFM model showed a qualitative leap: **The model explicitly recognized the placement bonus features!** In the validation set, the output click and conversion prediction ratios finally entered a "commercially acceptable" range.

## 2. Algorithms Driving Business: Four Billing Models and the Implementation of GSP

When the system simultaneously possessed usable **pCTR (Predicted Click-Through Rate)** and **pCVR (Predicted Conversion Rate)**, the business side exploded with potential. The era of "pure impressions" was over.

In the ranking logic of `ranking.service.ts`, I supplemented a complete set of billing calculations (eCPM conversion):

* **CPM**: $eCPM = Bid$
* **CPC**: $eCPM = Bid \times pCTR \times 1000$
* **CPA / oCPM**: $eCPM = Bid \times pCTR \times pCVR \times 1000$

To maximize the advertisers' benefits and prevent them from going bankrupt due to inflated bids, I conveniently implemented the **GSP (Generalized Second-Price)** charging mechanism. The advertiser ranked first only needs to pay the price corresponding to the eCPM of the advertiser ranked second:

```typescript
// Core logic for GSP charging
const nextEcpm = (i + 1 < sorted.length) ? (sorted[i + 1].score || 0) : 0;
let requiredBid = 0;

if (c.bid_type === BidType.CPC) {
    requiredBid = nextEcpm / (pctr * 1000);
} else if (c.bid_type === BidType.CPA || c.bid_type === BidType.OCPM) {
    requiredBid = nextEcpm / (pctr * pcvr * 1000);
}

// Actual cost is floored at 0.01 and does not exceed the advertiser's maximum bid cap
c.actual_cost = Math.min(c.bid, Math.max(0.01, requiredBid));
```

## 3. Game of Business: CPM, CPC, CPA, and oCPM

While writing this bidding logic, let me share some insights on these four models. In the AdTech ecosystem, there are three core roles: **Advertiser**, **Publisher (Traffic Owner)**, and **Ad Platform (Engine)**. Billing models are essentially about the transfer of "risk."

### 1️⃣ CPM (Cost Per Mille) - Pay per thousand impressions
* **Logic**: You pay as long as the ad is shown.
* **Perspective**:
  * **Publisher**: Loves it. A risk-free rent-collecting model. Traffic is real estate; you pay for the billboard space.
  * **Advertiser**: High risk. If the creative is terrible and no one clicks, the money is wasted.
  * **Platform**: Lowest technical difficulty. No need to calculate pCTR/pCVR. This is a crude play from the early classical internet era.

### 2️⃣ CPC (Cost Per Click) - Pay per click
* **Logic**: Money is deducted only when a user clicks the ad.
* **Perspective**:
  * **Publisher**: Starts to panic. What if an unappealing ad is served, wasting the impression space (yielding zero revenue)? To be profitable, the publisher must aggressively squeeze in ads with high click-through rates.
  * **Advertiser**: Feels a bit safer, paying only for the "intent audience." But if they click and don't buy (poor conversion), it's still a loss.
  * **Platform**: Must rely on an extremely strong **pCTR prediction model** to ensure high-CTR content is displayed, otherwise, the platform makes no money.

### 3️⃣ CPA (Cost Per Action) - Pay per conversion
* **Logic**: The advertiser only pays if the user downloads, registers, or makes a purchase.
* **Perspective**:
  * **Advertiser**: Most comfortable. This is pure "guaranteed performance advertising / ROI commitment."
  * **Publisher**: Strongly resists. Why should I be responsible if your product is unattractive or your registration funnel is too long?
  * **Platform**: Extremely high technical difficulty. Full-funnel data is uncontrollable and highly susceptible to fraud/abuse. Currently, pure CPA is actually quite rare in the market.

### 4️⃣ oCPM (Optimized CPM) - The Ultimate Weapon for Platform Profit
* **Logic**: **Charge by CPM (impression), but the platform uses algorithms to automatically optimize the audience based on a CPA (conversion) target.**
* **Perspective**: This is the absolute main force for modern dominant media platforms (TikTok/Ocean Engine, Tencent Ads, Facebook).
  * **Advertiser**: Only needs to set "my maximum acceptable cost to acquire a user (CPA Bid)," and the large model handles the rest. Costs are controllable, peace of mind.
  * **Publisher**: Still gets paid per impression, guaranteeing the value of their traffic.
  * **Platform**: Wins it all. Turns algorithmic moats into profit. The engine not only uses **pCTR + pCVR** to accurately target high-conversion users but also sells at a premium when traffic is abundant. Whoever has the most data and the strongest models dominates the market.

## 4. Fallback Strategies and the Data Flywheel

After the system upgrade, new challenges arose: If a newly created Campaign has no data, its pCTR prediction score will be extremely low. How can it ever get traffic?
Therefore, I configured an **Evergreen Campaign**. This is a pure brand-awareness fallback ad. No matter how fierce the competition is, it always absorbs the residual, unwanted traffic at a minuscule price, ensuring the ad slots are never empty. 

At the same time, a portion of these requests is reasonably distributed back to PulseSim.

More crucially, to make the algorithm stronger with use, in this commit, I injected the `pctr` and `pcvr` data obtained during the prediction phase back into the underlying `ad_events` log table.
**The so-called data flywheel has officially started.** Every prediction result made by the model during serving becomes the cornerstone for subsequent offline validation and Loss penalization.

Currently, after optimizing the pulse simulator, there are less than two days of complete and coherent multi-dimensional data in the system. I can't wait to see in a few days, when the data pool swells to a new magnitude, whether the new models trained by my "embryonic" engine can fight a beautiful battle in the upcoming automated auctions.

{{ github-link link="https://github.com/zhibinyang/openadserver-node" text="View on Github" }}