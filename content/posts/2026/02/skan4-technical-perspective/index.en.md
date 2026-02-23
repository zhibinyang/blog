---
title: "A Technical Perspective on SKAN 4.0: The Attribution Blackbox and Data Engineering in the Post-IDFA Era"
date: 2026-02-23T08:30:00+08:00
tags:
- adtech
- skan
- ios
- attribution
- privacy
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> When Apple brought down the privacy hammer to end the IDFA era, SKAdNetwork (SKAN) became a mandatory subject for all mobile advertising practitioners. However, the market is flooded with broad interpretations from a marketing standpoint, with very few articles truly diving into its underlying logic. As an engineer, how should you understand this love-hate protocol? You can simply view SKAN as a "centralized, anonymous, high-latency attribution proxy server" forcibly injected by Apple. This article will strip away its complex facade to redefine the essence of SKAN 4.0 and the game theory behind it, examining hard-core technical dimensions like link architecture, 6-bit conversion value mapping, hierarchical postbacks, and JWS signature verification.

<!--more-->

![SKAN 4.0 Vault](assets/cover.jpg)

## 1. Core Positioning: Who is Talking to Whom?

In the old IDFA era, the attribution pipeline was transparent and real-time: MMPs (like AppsFlyer, Adjust) easily connected clicks to installs via device IDs. In the SKAN era, attribution has become a **black box**.

The entire data pipeline has been completely architected by Apple:
1. **Ad Network**: When displaying an ad, it registers with the iOS system (signing an encrypted click/impression payload).
2. **iOS System (The Judge)**: After the user installs and opens the App, the iOS system takes over everything. It records the attribution locally on the phone and tells no one.
3. **App Developer**: Calls `updatePostbackConversionValue` within the App to inform iOS when the user performs a high-value action.
4. **Apple Attribution Server**: After a random delay (to camouflage the timestamp and prevent reverse engineering), Apple's server sends a **desensitized JSON payload (Postback)** to the Ad Network, and optionally CCs the advertiser's server.

During this process, you cannot obtain the user's device ID, nor do you even know the exact minute the conversion occurred.

## 2. Dancing in Shackles: The 6-bit Conversion Value

During the first postback window, the only way iOS allows developers to reveal user quality is through a field called **Fine-grained Conversion Value**.
**It is merely a 6-bit binary number (ranging from 0-63)!**

Apple's original intention for this design is to forcibly reduce data entropy. If you could send back exact spending amounts (e.g., $128.55), combined with a timestamp, you could easily cross-reference your own database to uncover the user's true identity. Compressing everything into 64 ticks is done to completely sever all possibilities of reverse identification.

But for the Ad Network's oCPM models, these 64 ticks are a lifeline. Technical teams must rack their brains to design **Mapping Strategies**:
* **Revenue Buckets**: 1=$0-5, 2=$5-10... Directly reflects IAP ROI, but ignores non-paying behaviors.
* **Funnel Model**: 1=Register, 2=Finish Tutorial, 4=First Purchase. Simple and direct.
* **Bitmask**: Fully utilizes the 6 bit positions, where the 1st bit means Registration, the 2nd bit means Add to Cart... Extremely efficient and can combine multiple behaviors, but can only track up to 6 distinct events.

## 3. SKAN 4.0's Three-Tier Postbacks and LockWindow

Compared to previous versions, SKAN 4.0 introduces an extremely complicated Hierarchical Window system, which is a watershed in understanding modern attribution engineering.

*   **Window 1 (0-2 Days)**: Can retrieve the 6-bit Fine-grained data (if privacy thresholds are met), mainly used for real-time oCPM bidding feedback.
*   **Window 2 (3-7 Days) & Window 3 (8-35 Days)**: **You will absolutely NOT get the 6-bit data!** Regardless of volume, Apple only provides `low`, `medium`, or `high` Coarse-grained values, used for long-term retention and fuzzy LTV evaluation.

**The Magic Move: LockWindow Mechanism**
Under default logic, iOS must wait out the entire window (e.g., end of day 2) plus a dozen hours of random delay before sending data. Ad platforms might not get the first conversion feedback until the 4th day after installation, which is too late for optimization.

SKAN 4.0 allows you to trigger `lockWindow: true` inside the App:
```swift
try await StoreKit.Postback.updatePostbackConversionValue(
    32, 
    coarseValue: .high, 
    lockWindow: true
)
```
This is akin to "handing in your exam paper early." If you notice a user tops up $100 just 4 hours after installing the App, you can identify them as a super high-quality user and directly lock the window. Sacrificing the subsequent 40+ hours of observation in exchange for the ad platform receiving the data two days earlier to optimize its model is a highly valuable commercial trade-off in the user acquisition battlefield.

## 4. Hierarchical Source-Identifier and Crowd Anonymity

In traditional advertising, you usually append a `campaign_id` parameter to the URL for tracking. In SKAN 4.0, this identifier has evolved into a `source-identifier` of up to 4 digits.

It utilizes an "onion skin" structure. Exactly how many digits you receive depends on the installation volume driven by this ad group (i.e., **Crowd Anonymity**):
*   **Low Volume**: You only get 2 digits (e.g., `27`). You only know this came from a broad, top-level Campaign.
*   **Medium Volume**: You get 3 digits (e.g., `527`). You can pinpoint the specific Ad Group.
*   **High Volume**: You get the full 4 digits (e.g., `9527`). You can precisely identify which Creative drove the conversion.

**Architectural Insight**: If your Campaigns are fragmented too finely, they will frequently fail to trigger the high anonymity tiers due to low volume, losing features. In severe cases (failing to meet even Tier 1 anonymity), even the conversion value itself will be masked as Null. User acquisition strategies must be aligned with underlying technical principles.

## 5. From a Backend Engineering View: JWS Verification and Self-Hosted Postbacks

If you wish to receive this precious, desensitized data directly in the cloud, simply configure `NSAdvertisingAttributionReportEndpoint` in your iOS App's `Info.plist`. Apple will then automatically send this JSON packet to your server routed at `/.well-known/skadnetwork/report-attribution/`.

The first step upon receiving a postback is absolutely not to save it into a database, but to **Verify the Signature**.

Apple embeds an `attestation-string` in every Postback. It is a JWS (JSON Web Signature) signed using Apple's official private key. You must fetch Apple's public key in the backend service and tightly verify the signature of the payload.
This is the technical baseline to prevent downstream ad fraud and to ensure that every cent of budget spent corresponds to a genuine, iOS-verified installation.

## 6. The Complete Postback JSON and Field Overview

For a more intuitive understanding, here is a typical SKAN 4.0 Postback JSON sample. Besides the conversion values, source identifiers, and signatures heavily discussed earlier, there are several key fields that determine data deduplication and traffic qualification:

```json
{
  "version": "4.0", // The SKAN protocol version
  "ad-network-id": "com.example.adnetwork", // ID of the Ad Network winning (or assisting) the attribution
  "source-identifier": "9527", // The hierarchical Campaign identifier
  "app-id": 123456789, // The Apple ID of the advertised App
  "transaction-id": "60230052-77d1-443b-9686-348612145678", // Unique transaction ID, critical for deduplication
  "conversion-value": 32, // The 6-bit fine-grained conversion value (0-63)
  "coarse-conversion-value": "high", // Coarse-grained conversion value (low/medium/high)
  "postback-sequence-index": 0, // Postback window index (0 for Window 1, 1 for Window 2, 2 for Window 3)
  "attestation-string": "MIIBjgYJKoZIhvcNAQcCoIIBfzCCAXsCAQEx...", // Apple's official JWS signature
  "fidelity-type": 1, // Attribution type (1 for click-through, 0 for view-through)
  "did-win": true // Whether this network won the final attribution
}
```

*   **`transaction-id`**: Extremely important. Due to network retries, Apple might send the exact same postback multiple times. Before saving to a database, you must rely on this field to build a unique index for strict deduplication.
*   **`postback-sequence-index`**: Tells you which phase of the 0-35 day lifecycle this data belongs to. The backend usually needs slightly complex logic to piece together the three postbacks (index 0, 1, 2) using the `transaction-id` to reconstruct a user's full trajectory.
*   **`fidelity-type`**: It is key to distinguishing traffic quality. `1` means the user actually clicked and opened the StoreKit page; `0` means View-through, where the user merely saw the ad creative without clicking, but organically installed it later.
*   **`did-win`**: A boolean value. `true` means this channel is the true hero of the conversion; `false` indicates that this channel only provided an assist, and Apple awarded the final attribution to another platform.
*   **(Fields not in the sample)** **`source-app-id` / `source-domain`**: The App ID or web domain where the traffic originated. Due to extremely strict privacy protections, these two fields are only included when crowd anonymity reaches the highest tier (Tier 3), making them exceptionally hard to obtain consistently for daily reporting.

## Conclusion

SKAN is not just a simple API; it is a game theory balancing act between privacy, model algorithms, and latency tolerance. Only by understanding the choice of "handing in early" via the client-side SDK, the 6-bit compression strategies, and the backend JWS verification and deduplication architectures can you truly grasp the underlying veins of future adtech pipelines. On the ruins of this fragmented data, rebuilding reliable LTV models is precisely the greatest technical moat for modern user acquisition teams.

{{< github-link link="https://github.com/zhibinyang/openadserver-node" text="View on Github" >}}
