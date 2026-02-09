---
title: "Where Did My Ad Budget Go? Unveiling TikTok's Mysterious Command Center: The 'SAN'"
date: 2025-11-17T08:00:00+08:00
tags:
- tiktok
- adtech
- measurement
categories:
- marketing
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> "Why does Google Analytics show only 10 TikTok conversions, but TikTok's dashboard shows 50? Is TikTok faking numbers?"
>
> This is the most common doubt I hear as an AdTech consultant. In an era where third-party cookies are dying out and privacy policies are tightening, advertisers often feel they are blindly throwing money into a "black box." In reality, this isn't data fabrication; we are entering a new era of "Walled Gardens." Today, I want to take you under the hood of TikTok's ad system to see how the core mechanism known as **"SAN" (Self-Attributing Network)** redefines "attribution" and "measurement" in a chaotic data world.

![cover](assets/cover.jpg)

## Behind Every Successful Ad, There's a Silent "Intelligence Agent"

At the most basic level, we are all familiar with the **TikTok Pixel**. It's like an "intelligence agent" planted on the advertiser's website.

When a user visits a website via a browser, browses products, or adds items to a cart, this "agent" existing in the form of Javascript code instantly captures these actions and quietly reports back to TikTok.

*   "Report, Officer. User ID 12345 just looked at a pair of shoes."
*   "Report, Officer. The same user just placed an order."

The Pixel collects not just actions, but also **user fingerprints**: IP address, device model, browser User Agent, and even (if Advanced Matching is configured) encrypted email and phone numbers.

Although the Pixel is diligent, it has a fatal weakness: **It relies too heavily on the browser environment.** In this era of rampant ad blockers and complex network environments, the Pixel's reports often "get lost in transit."

## Gear Upgrade: The "Red Hotline" of Events API

To solve the intelligence loss problem, TikTok offers heavy weaponry: **Events API (CAPI)**.

If the Pixel is an agent lurking behind enemy lines, then the Events API is a **Server-to-Server Red Encrypted Hotline**.

It no longer relies on unstable user browsers but directly connects the advertiser's server (or CRM, offline POS) with TikTok's servers.

*   **More Reliable**: Unaffected by browser blockers.
*   **More Comprehensive**: Can send back offline store purchase data (Offline Conversions).
*   **More Secure**: Data is masked and encrypted before transmission.

The current best practice is: **Use the Agent (Pixel) and the Red Hotline (CAPI) together.** Through an "Event Deduplication" mechanism, ensure data is neither missed nor duplicated.

## The Real Power Player Behind the Scenes: SAN (Self-Attributing Network)

Back to the opening question: Why does TikTok report far more conversions than Google Analytics?

Because TikTok (along with Google and Meta) is a **SAN (Self-Attributing Network)**.

Imagine ordinary ad platforms are like "mercenaries." They must rely on a third-party referee (like GA or an MMP) to tell them: "Hey, this sale came from you, credit to you."

But a SAN is different. It is an **Independent Kingdom with a so-called "God's Eye View"**.

Here is the logic of a SAN:
1.  **Full Data Ownership**: It has 100% of user behavior records within its own App (which video was watched, which button was clicked).
2.  **Self-Declaration**: When an advertiser sends a "conversion signal" (e.g., a user bought a pair of shoes), the SAN immediately queries its own database: "Did this user see my ad in the past 7 days?"
3.  **View-Through Attribution**: If the SAN finds that although the user didn't click the ad, they **completely watched** the ad video within 24 hours before the purchase, it will raise its hand and declare: "This sale happened because I planted the seed, count it as mine!"

This is the core difference. Third-party tools like Google Analytics typically only record "Last Click." They simply **cannot see** the moment the user was "impressed" on TikTok.

**The value of a SAN is that it restores the value of "impressions" (views).** Without the SAN mechanism, ads that drive conversions through visual impact would be severely undervalued.

## The "Shadow War" on Mobile: MMP vs. SDK

In the App promotion field, the war is even fiercer.

Mobile Measurement Partners (MMPs, like AppsFlyer, Adjust) play the role of "referee," using SDKs to adjudicate install attribution. To prevent data silos, MMPs come with a "winner-takes-all" logic: whoever touched the user last takes 100% of the credit.

This is a big problem for TikTok. If a user watches an ad on TikTok and three days later searches and downloads it on Google, the MMP will give all the credit to Google.

The consequence? TikTok's AI algorithm (oCPM) **"starves"** because it doesn't get this conversion data. It thinks its ad didn't work and stops showing ads to such users.

To break this black box, TikTok heavily promotes its **own Event SDK**.

This is like laying a direct **"Data Fiber Optic Cable"** straight to TikTok HQ right next to the MMP referee's bench.
*   **MMP says**: "This sale belongs to Google."
*   **TikTok Event SDK says**: "I don't care who it belongs to. This user recharged 100 bucks in the App anyway, I need to send this high-value signal **in full** back to TikTok's oCPM model for learning!"

In this way, TikTok's algorithm can feed on "full data," thereby more accurately finding those high-value "whale" users (VBO).

## Conclusion: Measurement is Cognition

The essence of advertising is the exchange of data.

Many times, we feel that ad performance is poor, not because the creative is bad, nor because the product is bad, but because **our measurement system missed half the signals.**

From Pixel to CAPI, and then to understanding the game between SAN and MMP, this is not just a technical configuration issue, but an upgrade in cognition of the **"User Decision Journey."** Only by understanding how data flows through these pipes can we clearly see where every cent of our ad budget goes.
