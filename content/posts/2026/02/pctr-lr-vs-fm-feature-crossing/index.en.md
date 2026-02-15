---
title: "Is My Model a \"Racist\"? A Logistic Regression Disaster in Ad Recommendation"
date: 2026-02-14T15:00:00+08:00
tags:
- adtech
- machine-learning
- pctr
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

Recently, I've been working on a pCTR (predicted Click-Through Rate) model for OpenAdServer. I thought I'd start simple with Logistic Regression (LR) to get the pipeline running. I generated about 200,000 lines of mock data, carefully embedding a few "main storylines"—for instance, a specific device in a certain country having a high click-through rate, while a specific ad slot from a certain channel performs terribly.

> But when I trained the model and looked at the weights, I was stunned: my model had turned into a "racist" that only cared about nationality! It assigned higher scores to junk traffic just because it came from a "high-weight" country, completely ignoring the actual ad performance. Was this a distortion of reality or a failure of the algorithm?

<!--more-->

![LR vs FM Feature Interaction](assets/cover.jpg)

## The Carefully Designed "Script"

To verify the model's effectiveness, I didn't use purely random data. Instead, I constructed a "script" based on business logic containing three typical traffic scenarios:

1.  **🔥 The Viral Combo**: Campaign 1 + Creative 5, placed in the Footer slot. **Sky-high CTR.**
2.  **💩 The Junk Traffic**: Xiaomi phone + UC Browser, placed in the Sidebar. **Extremely low CTR.**
3.  **😐 The Baseline**: A standard Samsung phone user with average metrics across the board.

I confidently fed this data into the LR model, expecting it to be like Sherlock Holmes, instantly seeing through the "Junk Traffic" disguise.

## The Reality Check: The Model Was "Blind"

The training process looked perfectly normal. The Loss curve went down steadily, and the accuracy was decent. But when I fed those three typical scenarios back in for prediction, the results hit me like a ton of bricks:

```
Scenario                           pCTR
🔥 Viral Combo (Camp 1, Creat 5...)  2.91%
💩 Junk Traffic (Xiaomi + UC)        3.77%  <-- ?!
😐 Baseline (Ordinary User)          0.39%
```

Wait a minute! **Why is the predicted pCTR for "Junk Traffic" (3.77%) higher than the "Viral Combo" (2.91%)?!**

Did I write my data generation script backwards? I checked it repeatedly and confirmed that `xiaomi + uc browser` was indeed set to have a very low CTR. The problem had to be with the model itself.

## The Investigation: Secrets in the Weights

To find the truth, I dug out the weights for every feature in the model and performed a "post-mortem."

### 1. The Insane Geographic Bias

First, I found that the weight for `Country: CN` (China) was ridiculously high, reaching **+1.31**. Meanwhile, the weight for `Country: US` (USA) was a negative **-1.35**.

### 2. The Buried Details

Now look at the feature combination for the "Junk Traffic":
*   The weight for `Device: xiaomi` was tiny, not even making it into the top 10 negative weights (probably around -0.1).
*   The weight for `OS: android` was **-1.38**.

The model's calculation logic turned into this simple arithmetic:

> **💩 Junk Traffic Score** = CN (+1.31) + Xiaomi (-0.1) + Android (-1.38) ... **≈ Positive Score**

And my "Viral Combo"? Even though Creative 5 is strong, just because it unfortunately happened in the US, it started with a debt of **-1.35**.

> **🔥 Viral Combo Score** = US (-1.35) + Creative 5 (+1.0) ... **≈ Negative Score**

**The Truth Revealed**: My LR model had become a total "map cannon" (a slang term for broad generalization). It believed that as long as traffic came from China, it should be clicked, completely ignoring the specific, subtle combination of "Xiaomi phone using UC Browser" which was actually garbage. It was completely dominated by the **high-frequency feature** of Country.

## The Fatal Flaw: LR Doesn't Understand "Combos"

This disaster vividly demonstrated the biggest Achilles' heel of Logistic Regression in recommendation systems: **The Feature Independence Assumption**.

LR is a **linear model**. In its world, features never talk to each other.
*   It knows "China" is good.
*   It knows "Xiaomi" is slightly bad.
*   But it **doesn't know** what chemical reaction happens when "China + Xiaomi" appear together.

It can only do addition. It cannot comprehend: **"Although CN adds points, if CN + Xiaomi + UC Browser appear together, it should subtract points."** This is the so-called lack of **Feature Interaction**.

## The Solution: FM (Factorization Machines)

To solve this, we can't let the model just do addition anymore. We need it to learn "multiplication"—to understand **combinations**.

This is where **Factorization Machines (FM)** come in.

The core idea of FM is: **Assign a latent vector (Embedding Vector) to every feature. When two features appear together, calculate the inner product of these two vectors as the weight of their "combination".**

*   If LR: Score = $w_{CN} + w_{Xiaomi}$
*   If FM: Score = $w_{CN} + w_{Xiaomi} + <V_{CN}, V_{Xiaomi}>$

With that extra term, even if $w_{CN}$ is high, if the model learns that "CN" and "Xiaomi" are a bad pair, it will train $<V_{CN}, V_{Xiaomi}>$ to be a large negative number, dragging the score down!

## Conclusion

This LR disaster, while embarrassing, was a perfect textbook case. It made me deeply understand why industrial recommendation systems need complex models like DeepFM and DCN.

It's not just for showing off—it's because **the logic of data in the real world is never linear.**

Next step? I'm going to upgrade my PyTorch code to introduce an Embedding layer and implement FM or even DeepFM. Then we'll see if that "Xiaomi + UC" combo can still fool the model!
