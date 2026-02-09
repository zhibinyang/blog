---
title: "Garbage In, Garbage Out? Feed These Three Types of Data to TikTok's AI to Make It Make Money for You"
date: 2025-11-15T08:00:00+08:00
tags:
- tiktok
- adtech
- ai
categories:
- marketing
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> "Can we just count every ad click as a conversion, regardless of whether the user buys or not? The data would look much better."
> 
> In the era of AI-driven advertising (oCPM), this kind of thinking is not just self-deception; it's practically destroying your campaign model with your own hands. **The essence of ad optimization is actually training an AI.** Whatever data you feed it, that's what it becomes. If you feed it "clicks" (junk data), it will fetch you countless "trigger-happy" users who never convert. Today, let's skip the code and talk about how to design a perfect "data diet" to feed TikTok's algorithm into your top salesperson.

![cover](assets/cover.jpg)

In the AI era, the way we interact with ad platforms has fundamentally changed. We used to "Buy Traffic"; now we "Buy Outcomes."

TikTok's oCPM (Optimized Cost Per Mille) algorithm is like a hungry beast that needs to constantly consume "conversion data" to survive and evolve. But not all data is good feed.

To make this beast make money for you, you need to carefully prepare these three courses:

## The Main Course: Standard Events — The Lingua Franca of AI

Many beginners like to get clever: "I want to track when a user views a 'red dress', so I'll create a custom event called `view_red_dress`."

**Please don't do that.**

TikTok has predefined a set of **Standard Events** (like `ViewContent`, `AddToCart`, `Purchase`). These aren't just names; they are the **Lingua Franca** of the entire TikTok ecosystem.

*   **Why use Standard Events?**
    Imagine TikTok's algorithm processing billions of `Purchase` events globally every day. It knows exactly that this means "someone paid money."
    *   When you send back a `Purchase` event, you are leveraging the trillion-level data wisdom TikTok has accumulated.
    *   When you send back `buy_red_dress_now` (a custom event), to the AI, this is a brand new vocabulary it doesn't recognize at all. It has to learn what this word represents from scratch, drastically reducing learning efficiency.

**Best Practice**: **If it fits, use it.** Even if your business is "users testing cars online," map it to a standard event like `ViewContent` or `InitiateCheckout`.

## The Second Course: Reserved Events — Don't Step on Mines

When naming events, there's an invisible minefield called **"Reserved Events"**.

For example, you might want to customize an event called `Browse`. But in TikTok's dictionary, `Browse` is a reserved word, and the system will automatically force-map it to the standard event `PageView`.

*   `Checkout` -> Automatically becomes `PlaceAnOrder`
*   `Registration` -> Automatically becomes `CompleteRegistration`

If you mix these names up, it leads to "garbled" data or misclassification in the backend. Before naming any Custom Event, check the documentation to avoid these "system reserved words."

## The Third Course: Offline Conversions — The Final Piece of the Puzzle

This is the most overlooked but highest-value piece of the puzzle.

For many brands (like automotive, real estate, retail), ads are viewed on TikTok, but transactions happen in physical stores.
If you only send back online `FormSubmit` events, the algorithm can only help you find "people who like filling out forms," not "people who actually buy cars."

**Offline Conversions** allow you to send transaction data from your store's POS system back to TikTok via API.

What's the use of this?
*   **Closed-Loop Verification**: You can clearly see via Match Keys (phone number/email) that out of the 50 people who bought cars in store last week, 20 had swiped your video half a month ago.
*   **Value-Based Optimization (VBO)**: The value of an online lead might be unknown, but the offline transaction amount is real. Send this `Value` back to the AI, and it learns: "Oh, so people with these characteristics (high net worth) buy expensive things," and will prioritize finding such people in future campaigns.

## What is a Real "Data Strategy"?

So-called data strategy isn't about creating a mess of events in the backend. It's about **clearly telling the AI what exactly you want.**

*   If you want users to view pages, feed it `ViewContent` — it will bring you a bunch of "window shoppers."
*   If you want users to fill forms, feed it `SubmitForm` — it will bring you a bunch of "form fillers."
*   If you want users to pay, you must, absolutely must feed it `Purchase` (with the amount).

**Don't lie to the algorithm.** In front of AI, honesty isn't just a virtue; it's a means to make money.
