---
title: 2026 AdTech Full-link Experiment Proposal
date: 2025-01-29T15:06:11+08:00
tags:
- adtech
- adserver
- measurement
categories:
- adtech
comment: true
---


> At the beginning of 2026, I plan to use the experience accumulated in my previous work, combined with my understanding of digital marketing, to build a complete digital marketing advertising delivery system.


### 1. Core Architecture Composition

This proposal consists of four core modules, simulating a real digital marketing ecosystem:

* **Publisher Side (Publisher)**: A personal technical blog built on **Hugo (FixIt Theme)**, serving as the carrier for ad display.
* **Advertiser Side (Advertiser)**: A headless e-commerce site built on **Vendure (Node.js / NestJS)**, serving as the place where conversions occur.
* **Ad Engine (Ad Server)**: A deeply customized **OpenAdServer (Python/FastAPI)**, responsible for ad delivery algorithms, VAST protocol adaptation, and model retraining.
* **Data Hub (Tracking & Data)**: A first-party data collection system based on **sGTM (GCP)** and **Cloudflare Worker**.


### 2. Core Technical Links

#### A. Ad Delivery & Rendering (Hybrid Native Ad)

* **Injection Method**: Adopting **Hybrid Mode**. Placeholders are reserved in Hugo templates, and ad logic is dynamically injected via **GTM (Web)**.
* **Protocol Support**: OpenAdServer adds **VAST 3.0** and **OpenRTB** adaptation layers, supporting **Display, Video, Native** formats.
* **Targeting Logic**: GTM extracts blog post keywords as contextual signals (Contextual Tags) and passes them to the Ad Server for matching.

#### B. Data Collection & Attribution (Server-Side Tracking)

* **First-Party Proxy**: Proxy all tracking requests via **Cloudflare Worker** to bypass ad blockers and maintain first-party cookies (ITP response solution).
* **Full-path Tracking**:
	* **Blog Side**: Record ad impressions via GTM Element Visibility.
	* **E-commerce Side**: Vendure frontend records add-to-cart, backend subscribes to `order.placed` event via **EventBus** to implement **S2S (Server-to-Server)** conversion postback.
* **Attribution Correlation**: Use `ga_session_id` and custom `click_id` to complete the closed-loop mapping from click to conversion in sGTM.

#### C. Algorithm Closed-Loop & Business Decision (AI & ROAS)

* **Data Simulation**: Use **PyMC-Marketing** to generate simulated user flows based on Bayesian probabilities, solving the problem of insufficient cold-start data.
* **Model Training**: OpenAdServer receives conversion signals returned by sGTM, performs incremental learning, and optimizes the Click-Through Rate (CTR) estimation model.
* **Business Analysis**: Aggregate Vendure order amounts and ad spend in **BigQuery** to calculate and monitor **ROAS** metrics in real-time.


### 3. Proposal Highlights

1. **Privacy Compliance Response**: The proposal fully implements server-side tracking (sGTM), demonstrating a technical solution to maintain attribution accuracy in the Cookie-less era.
2. **Full Protocol Coverage**: From simple JSON to standard VAST and OpenRTB, demonstrating a deep understanding of IAB standards.
3. **Digital Twin Experiment**: Simulating real market feedback via PyMC proves that the system can not only run but also self-optimize based on complex probability distributions.
4. **Cloud-Native Engineering**: Fully deployed on GCP and accelerated at the Cloudflare edge, reflecting architect-level Infra control capabilities.
