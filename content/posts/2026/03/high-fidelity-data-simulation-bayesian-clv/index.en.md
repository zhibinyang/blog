---
title: "Fooling Bayes: How I Used LLMs to Forge 50,000 'Living' Digital Humans"
date: 2026-03-24T16:00:00+08:00
tags:
- data-science
- pymc-marketing
- adtech
- simulation
categories:
- adtech
- ai
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> While introducing a Customer Lifetime Value (CLV) prediction system to OpenAdServer, I ran into a hardcore issue: a simple `Math.random()` can't generate data with a "soul." Feeding a bunch of patternless white noise into a Bayesian model yields nothing but meaningless gibberish. To successfully run the BG/NBD and Gamma-Gamma models in PyMC-Marketing, I had to upgrade my LLM-based simulation engine, PulseSim. Through endless cycles of model explosions and parameter refactoring, one truth became painfully clear: **If you want to trick a rigorous statistical model with fake data, you have to understand "human nature" better than the model does.**

<!--more-->

![Cover Image](assets/cover.jpg)

I previously wrote an article detailing [how I built the PulseSim AdTech digital twin simulation engine](../pulsesim-adtech-simulation-engine) to send mock requests to OpenAdServer and accumulate data. Since the original goal was merely to validate the system loops for CPC, CPA, and oCPM, randomly generated story arcs and transient users were barely enough to get by.

But as I dove deeper into the business logic, preparing to train a precise CLV (Customer Lifetime Value) prediction model based on historical data, the previous approach completely broke down. Randomly fluctuating, transient users meant **user personas couldn't be solidified**, making concepts like "repurchase cycles" and "individual average order value (AOV) preferences" utterly impossible to track.

So, I decided to give PulseSim an upgrade: building a highly realistic, parallel-world dataset from scratch.

## Breathing Life into Digital Humans: Solidifying Personas and the Cycle of Life

The first step was to mold a "fixed, permanent population with distinct personalities."

Using my old trick, I first had an LLM spit out 100 highly narrative seed personas based on real-world internet user demographics. Then, I proportionally expanded these seeds, brute-forcing **50,000 static, permanent digital residents**.

To reflect differences in transaction frequency, these 50,000 people were implicitly divided into four major conversion tiers:
*   **Whale**: High click-through rate (2.0x CTR), extremely high conversion rate (4x the base 5% CVR)
*   **Minnow**: Moderately active (1.2x CTR), normal conversion rate (1.0x CVR)
*   **Browser**: Low clicks (0.8x CTR), abysmally low conversion rate (0.02x CVR—the window shoppers)
*   **Newbie**: High initial engagement (1.5x CTR), baseline conversion (1.0x CVR, but decays with tenure)

Furthermore, to prevent these 50,000 accounts from turning into a stagnant pool, I designed a **Churn & Acquisition mechanism**. Every day, as the simulation clock ticked forward, the system ruthlessly "deleted" the oldest 1,000 users and replenished the pool with 1,000 fresh newbies carrying brand-new attributes. This perfectly recreated the authentic churn and acquisition curves found in a real product's lifecycle.

With this foundation, I couldn't suppress my urge to generate data. I wrote a time-machine script that ran the designed traffic waveforms in reverse, forcibly backfilling a **complete 50-day historical log**. It generated about 40MB of files per day, containing over 300,000 impression, click, and purchase events.

Armed with this hefty, logically sound raw transaction dataset (User ID, Purchase Time, Purchase Amount), I eagerly marched into the CLV training room built by PyMC-Marketing—which is where the real pitfall-ridden journey began.

## A Series of Traps: Triggering the Gamma-Gamma Model's Reverse Scales

As I mentioned when [deconstructing the BG/NBD model](../bayesian-think-bayes-bgnbd), it not only requires knowing how relatively frequently customers transact, but it also attaches a **Gamma-Gamma model** to predict the Monetary Value (average order value).

And this attached model has a mathematical OCD borderline on pathological.

### Trap 1: The Homogenized 10~5000 Grand Randomization

Initially, when generating transaction amounts, I lazily hardcoded a random value between `10 ~ 5000` in the script. Throwing this into the BG/NBD model to fit frequencies worked perfectly, as the four user tiers mentioned above had distinctly differentiated CVRs. But when fitting the Gamma-Gamma model to calculate AOV, it instantly blew up—the system spat out a ludicrously high *p-value*.

**Why?**
Because within this purely random `10~5000` range, **the AOVs of these 50,000 users lacked "personality."** Statistically speaking, everyone averaged exactly 2500 with the exact same variance. The model realized it was fundamentally impossible to extract a unique characteristic distribution for any individual.

### Trap 2: Mutually Coupled Death Sentences

I figured, if you want personality, I'll give you personality. I assigned **mutually exclusive** AOV ranges to each of the four conversion tiers (Whales, Minnows, etc.). People with high conversion rates buy expensive things; people with low conversion rates buy cheap things.

I ran it with high hopes, only to crash again. After debugging, I was horrified to discover that I had artificially pushed the correlation coefficient between Average Order Value (AOV) and Frequency to nearly **0.5**.

You see, **a hard-coded rule of the Gamma-Gamma model is that AOV and transaction frequency must be relatively independent (correlation < 0.1).** This mathematical requirement—which often contradicts the common-sense assumption that "people who buy often also buy expensive stuff"—was instantly shattered by my presumptuous mapping.

### Trap 3: Seemingly Orthogonal, Actually Multi-Modal

Having learned my lesson, I constructed a new "purchasing power stratification" entirely independent of the 4 frequency features, ensuring they were completely orthogonal. The purchase amount distributions now overlapped instead of being sliced into isolated chunks.

But I took a shortcut during implementation: **Following the code's execution flow, right at the exact moment a user "decided to convert," I dynamically rolled the dice based on ratios, dropping them into a random purchasing power bracket to calculate an amount.**

It still failed. In the eyes of the Gamma-Gamma model, the "double Gamma"—meaning how much an individual is willing to pay—must intrinsically be an independent Gamma distribution. It should form a single smooth hill. By grouping them dynamically at the time of transaction, users with multiple repeat purchases ended up with historical transaction amounts that showed several weird, multi-modal spikes at the individual level.

**The Ultimate Fix:**
**Bake the traits into their DNA.**
I had to go back to the very source. When generating those 50k permanent users, I took the second, orthogonal set of "AOV distribution parameters" and **solidified them onto the user persona** as unalterable constants in their dictionary. Then, I restarted the time machine and regenerated the 50 days of historical data entirely from scratch.

## Aha Moment: Breaking the Stagnant Water of MCMC

Holding this solidified dataset—finally flawless in both logic and probability—I ran the PyMC model once again. It finally worked; no errors. But the $p$-value was still hovering in limbo, and worse yet—the MCMC (Markov Chain Monte Carlo) sampling crawled slower than a snail, acting as if it were performing astronomical computations.

I opened my test code and kicked open the black box underlying PyMC-Marketing's configuration.

After some deep reading and tracing, I spotted the anomaly: to guarantee versatility, the model defaults to a `HalfFlat` assumption for the Prior describing the hyperparameter distributions in Gamma-Gamma. This is equivalent to wandering blindly across a boundless, constraint-free flatland, causing the sampling path to behave like a headless fly in a massive space.

With a slight flick of my fingers, I changed the hyperparameter's prior to `HalfNormal`:
*"Stop wandering to the ends of the earth; it's highly likely somewhere in the normal range around zero."*

The very second I restarted it after that tweak, **the whole world went quiet.**

The code that previously looked like it would run until the heat death of the universe finished fitting cleanly in **under 1 minute**. When the progress bar completed, the key metric for parameter convergence—**r-hat** (the convergence diagnostic criterion)—steadied flawlessly at approximately 1.00, perfectly locked into place. The predicted AOV values tightly hugged the true script I had buried when forging the data.

## Conclusion

Throughout this exhausting ordeal, I felt like I had stepped on every conceivable landmine. But the biggest takeaway wasn't memorizing a few Bayesian hyperparameters; it was a philosophical lesson in computer simulation:

When we attempt to construct a digital twin architecture, we cannot let engineering arrogance define the laws of the universe. The model is the incarnation of objective mathematics. **Even when faking it, you must meticulously respect the laws of statistics, respect the orthogonality of features, and respect the singularity of distributions.**

When this 40MB/day of PulseSim data finally won the approval of the Bayesian model, it ceased to be a pile of fabricated, cold tracking logs. It became a batch of "high-fidelity digital lifeforms"—driven by code, endowed with personality, and rigorously validated by mathematics.
