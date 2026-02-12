---
title: "AdTech Sandbox Puzzle: Building a 'Shell' E-commerce Site for Attribution Testing with Qwik & Cloudflare"
date: 2026-02-02T21:00:00+08:00
tags:
- measurement
- adtech
- ga4
categories:
- adtech
- measurement
- coding
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> My AdTech Sandbox felt like a puzzle with a missing piece. I had the Publisher and the AdServer, but to close the loop on ad delivery, I needed an "Advertiser". After all, without simulating real e-commerce conversions, Attribution & Measurement is just theory. To fill this gap, I decided to build an e-commerce site. What I didn't expect was that the so-called "full-stack" approach almost made me quit, but in the end, I was saved by the official "Read-only" Demo API and free hosting on Cloudflare Pages.

<!--more-->

![cover](assets/cover.jpg)

## Seeking the Natural Advertiser

In my AdTech Sandbox task list, **Attribution and Measurement** are core critical. To test these, what fits best? A decent-looking e-commerce site, of course.

Months ago, I tried performing "surgery" on a Vue Storefront project to implant conversion tracking. But as a pure frontend project, the backend integration remained broken for various reasons—like a car body without an engine. Later, during a "pair programming" session with Gemini, considering my familiarity with the Node.js FullStack stack, it recommended **Vendure**.

It sounded great: TypeScript, GraphQL, Headless—everything very modern.

## The "Deterrence" of Mono Repo & The Rise of Qwik

After some research, I found Vendure's ecosystem quite mature, with several official Storefronts. I enthusiastically followed the recommendation and pulled the Mono Repo—containing both backend and frontend—thinking "one-click start, world domination".

Reality was harsh. The dependencies in the Mono Repo were a mess, conflicting with my local environment. `npm install` failed, `yarn` failed, and even "home remedies" found on Github didn't work. After struggling for half a day, I abandoned the "monolith" obsession and decided to **decouple**.

I chose to run only the Vendure backend and Postgres database locally with Docker. Backend secured, what about the frontend? Although Next.js is the official top pick with the strongest ecosystem, in the AdTech experimental field, sometimes "alternative" means more fun. Looking at the **Qwik** Storefront, with slightly fewer stars but claiming extreme performance, I decided: this is the one.

## Tracking Engineering Power by Vibe Coding

After choosing Qwik, the focus returned to the original goal: **Telemetry (Tracking)**.

First, integrating GTM and GA4—standard procedure. Then, following the standard e-commerce funnel, I needed to embed tracking code in various Qwik components:
- `view_item`: Product Detail Page
- `add_to_cart`: Add to Cart click
- `begin_checkout`: Enter Checkout
- `add_shipping_info`: Fill Shipping Info
- `purchase`: Final Order (Mock Payment)

During this process, frontend code modification was inevitable. To meet strict AdTech data requirements, I needed to push more precise data to the Data Layer, such as pre-tax prices, total price excluding shipping, and SKU info. This is where **Vibe Coding** mode shined—I just described the needs, and the code changes happened naturally.

## Discovering the Secret of the "Read-Only" API

In the testing phase, I always connected the frontend to my local Docker backend. When considering deployment, I hesitated: did I really need to buy a server to run a Node.js backend just for a test Storefront?

Just then, I re-examined Vendure's official Demo site. Its backend GraphQL API is labeled `Readonly`. Curious, I tried walking through the order process—and it worked! I logged in with a test user account, and the order was right there in the cart.

It turns out, "Read-only" might just mean it periodically resets the database, but within that cycle, it's a fully functional backend!

This discovery changed everything.

## Zero-Cost Full-Stack Deployment

Since the backend could be officially "freeloaded" via the Demo API, the frontend only needed a static hosting platform.

The deployment architecture instantly became incredibly lightweight:
1.  **Frontend**: Github Actions automatically builds the Qwik project.
2.  **Hosting**: Artifacts pushed to **Cloudflare Pages**.
3.  **Backend Connection**: Configured to connect to the official Demo GraphQL API.
4.  **Network**: Enabled Cloudflare's "Orange Cloud" proxy to utilize its global network acceleration, ensuring access from within China.

Thus, my Vendure Web Storefront was complete. It has no database of its own, no paid server, yet it can browse, order, and track data, perfectly playing the role of the "Advertiser" in my AdTech Sandbox.

Here is a preview of the deployed site:

![preview](assets/storefront-preview.jpg)

Sometimes, done is better than perfect. And a free solution that works is the best solution.

{{< github-link link="https://github.com/zhibinyang/storefront-qwik" text="View Project on Github" >}}
