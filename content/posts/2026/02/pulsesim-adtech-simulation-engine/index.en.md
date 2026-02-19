---
title: "Digital Twin from a God's Eye View: Orchestrating an AdTech Simulation with AI"
date: 2026-02-19T16:00:00+08:00
tags:
- adtech
- nodejs
- ai
categories:
- adtech
- ai
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> After building the OpenAdServer delivery system, I faced a core pain point: the system only had sporadic test traffic, lacking large-scale, high-quality data to train the pCTR model. If I just poured in random data, the model would only learn white noise. To simulate real market feedback, I decided to design and implement PulseSim-2026 — an AdTech digital twin simulation engine with a "God's eye view," with an LLM serving as the chief director.

<!--more-->

![PulseSim Dashboard](assets/cover.jpg)

## 1. Project Inception: The "No Data" Dilemma

Anyone who has worked in AdTech knows that **data is the fuel for algorithms**.

After setting up the **OpenAdServer** delivery system, I found myself in a catch-22:
* No traffic means no logs.
* No logs means deep models like DeepFM can't be trained and can only guess randomly.
* Random guessing leads to poor performance, which further discourages real traffic.

I realized that if I just wrote a `for` loop to generate a pile of `Math.random()` data, although it could fill the database, the model would learn nothing but **White Noise**. To make DeepFM truly learn "what kind of people like to click on what kind of ads," I needed a set of simulation data that is **logically self-consistent**, **fits probability distributions**, and even **carries market sentiment**.

Thus, **PulseSim-2026** was born. It is not a simple load testing tool, but a digital twin engine with a "God's eye view."

## 2. Evolution: From Static Scripts to Continuous Pulse

My design philosophy evolved from "generating files" to "driving streams":

* **Ver 1.0: Static Scripts**
  Initially, I wrote a Python script that generated 200,000 logs in one go. It solved the "volume" problem, but it was **static**. I couldn't observe the pressure on system I/O during "evening peak traffic surges," nor could I test the logic of "cross-day attribution."

* **Ver 2.0: The Pulse (Current Stage)**
  I switched to **Node.js/TypeScript** to build an asynchronous state machine that continuously sends requests to the AdServer at a frequency of **5 QPS** (dynamically adjustable).
  * **Heartbeat Design**: This continuous "pulse" brought the entire BigQuery data pipeline to life. The curves on the Looker dashboard started to jump, and I could see changes in RTB response latency, impression rates, and conversion rates in real-time.

## 3. Core Highlight: LLM-Driven "Market Director" Mode

This is my proudest design. To give the simulated data commercial logic, I introduced **Gemini LLM** as the system's "Screenplay Director."

In `src/director/director.ts`, I designed a `Director-Cron` task.

### Logically Self-Consistent Scenarios
Every day at 00:00, the LLM combines the current date (e.g., "Friday," "Valentine's Day") and the real Campaign configurations in the AdServer to weave a market story.

> **Gemini Director's Script Example:**
> "Today is Friday, approaching the weekend. Office workers are starting to plan short trips. Interaction rates for travel ads (Campaign #12) on iOS devices are expected to increase by 30%. Meanwhile, as it is a working day, PC traffic remains stable, but mobile traffic will explode during the evening peak."

### Feature Offset Multipliers
The LLM does not directly generate random numbers but outputs a set of **Traffic Trends** JSON configurations. For example:

```json
"traffic_trends": {
    "country_weights": [ { "code": "CN", "weight": 1.5 }, { "code": "US", "weight": 0.8 } ],
    "os_weights": [ { "name": "ios", "weight": 1.3 } ],
    "browser_weights": []
}
```

* **Long-term Physical Laws**: Base CTR is set to 2% (`src/engine/probability.ts`).
* **Short-term Trend Fluctuations**: The LLM's coefficients (e.g., `ios: 1.3`) are superimposed as multipliers on top of the baseline.

This design perfectly simulates real-world **Data Drift**. The model must constantly adapt to these changes to provide accurate high scores based on local conditions.

## 4. Behavioral Modeling: Restoring Humanity with Math

I know that "uniform distribution" is the killer of ad simulation. In the real world, no one is uniformly distributed.

### Long-tail Lag of Conversion
After users click on an ad, they often don't place an order immediately. To simulate this "hesitation period," I implemented a **power function distribution** delay logic in `src/engine/pulse.ts`:

```typescript
// Simulate random delay from 1 minute to 24 hours
const MIN_DELAY = 60 * 1000;
const MAX_DELAY = 24 * 60 * 60 * 1000;

// Use power function Math.pow(r, 3) to create long-tail effect
// 80% of conversions will fall within a short time, but a long tail will drag on to 20 hours later
const bias = Math.pow(Math.random(), 3);
const tailDelay = Math.floor(bias * (MAX_DELAY - MIN_DELAY));
```

This directly challenges the **Attribution Lookback Window** logic I wrote in BigQuery. If my SQL is wrong, the attribution of delayed conversions will fail, and the ROAS calculation will be wrong. This is the true meaning of simulation!

### User Intent Score
Through `ProbabilityEngine`, I assigned different purchase probabilities to users with different profiles. For example, users with the `shopping` interest tag will have a 1.5x bonus on their CVR (Conversion Rate). This way, the ROAS data on the Looker dashboard will show business relevance instead of a mess.

## 5. Engineering Rigor: Considerations for Production Environments

As an architect, I care not only about algorithms but also about the long-term stability of the system running on GCE.

* **Hot-Reloading & Continuity**
  I use `fs.watch` to listen for changes in `daily_script.json`.
  ```typescript
  private watchScript() {
      fs.watch(this.scriptPath, async (event) => {
          if (event === 'change') await this.loadScript();
      });
  }
  ```
  This means that when the LLM updates the "Today's Script" at midnight, the simulator **does not need to restart**. "Delayed conversion" events waiting in the memory queue will not be lost, and the cross-day attribution chain will not be broken.

* **Cost Control**
  To prevent the LLM from consuming too many Tokens, I implemented Hash validation. The LLM is triggered to regenerate the script only when the AdServer's Targeting rules change substantially; otherwise, the old rules are reused.

* **Self-Healing Ability**
  To meet demonstration needs, I reserved a manual trigger API. When I modify the AdServer configuration, I can force a trigger of LLM synchronization with one click to achieve "on-demand simulation."

---

## Conclusion

PulseSim-2026 is the most interesting part of the AdTech loop I built. It is no longer a passive data generator, but a living, even slightly "dramatic" digital world.

In this world, the LLM is the screenwriter, Node.js is the stage, and BigQuery and AI models are the audience in the pit, trying to summarize a little bit of mathematical laws about "humanity" from these bizarre performances.

{{< github-link link="https://github.com/zhibinyang/openadserver-pulsesim" text="View Project on Github" >}}
