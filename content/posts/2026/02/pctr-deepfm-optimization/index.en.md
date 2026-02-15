---
title: "The Junk Traffic is Bad, but \"China\" is Too Good? DeepFM's Geographic Bias"
date: 2026-02-15T16:00:00+08:00
tags:
- deepfm
- pctr
- machine-learning
- adtech
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

Last time, my Logistic Regression (LR) model crashed and burned because of the "Feature Independence Assumption," treating junk traffic like treasure. To redeem myself, I brought out the heavy artillery—**DeepFM**. I expected it to use the "God's Eye View" of deep learning to see through the complex feature combinations. But after training and running the model, I fell into deep thought again: even though I injected negative bias into the junk traffic, its predicted value remained stubbornly high. This time, it wasn't the algorithm's incompetence, but the data telling me a cruel truth: in the face of absolute "geographic dividends," minor flaws can truly be forgiven.

![DeepFM Architecture](assets/cover.jpg)

<!--more-->

## From LR to DeepFM: A Major Upgrade

LR suffers because it can only do addition. To let the model learn to "think" about the chemical reactions between features, I introduced DeepFM. It has two powerful components:
1.  **FM Component**: Specifically responsible for second-order feature interaction, automatically learning weights for combinations like "Xiaomi + UC Browser".
2.  **Deep Component**: A Deep Neural Network (DNN) responsible for mining higher-order nonlinear relationships.

I configured a 16-dimensional latent vector (Embedding Dim) and built a three-layer neural network of `[128, 64, 32]`. This configuration, on a dataset of this size, is definitely "using a sledgehammer to crack a nut."

## Round 1 Test: An Awkward Start

To get the pipeline flowing first, I set a relatively "conservative" group of parameters:
*   `EMBEDDING_DIM`: 8
*   `DNN_HIDDEN_UNITS`: [64, 32]
*   `DNN_DROPOUT`: 0.5

The training process was uneventful, but the prediction results made me frown:

```
🚀 DeepFM Serving Verification Results (First Round):
--------------------------------------------------
Scenario                           pCTR
🔥 Viral Combo (Camp 1, Creat 5...)  7.57%
💩 Junk Traffic (Xiaomi + UC)        0.56%
😐 Baseline (Ordinary User)          5.30%
--------------------------------------------------
```

This result feels **a bit off**.
Although the "Viral Combo" is indeed higher than the "Baseline", and the "Junk Traffic" is only 0.56%, the ranking seems fine.
But! **The Baseline reference value is as high as 5.30%!**

You have to know that our global average Click-Through Rate (Base CTR) is set at around **2%**. A prediction of 5.3% CTR for an ordinary user means the model is generally **Over-estimating**. This also caused the "Viral Combo" to be only 7.57%, failing to open up a significant gap.

## Round 2 Optimization: Double Adjustment of Parameters and Data

To solve the "Over-estimation" problem and further dig into feature potential, I decided to "increase the dosage":
1.  **Increase Capacity**: Doubled `EMBEDDING_DIM` to **16** to accommodate more information in latent vectors.
2.  **Deepen the Network**: Adjusted DNN to `[128, 64, 32]` to enhance nonlinear fitting capability.
3.  **Lower Dropout**: Adjusted to 0.15 to let the model learn more "solidly".

At the same time, I fine-tuned the training data to ensure the distribution of positive and negative samples is closer to real business scenarios.

After training again, the new results came fresh out of the oven:

```
🚀 DeepFM Serving Verification Results (Second Round):
--------------------------------------------------
Scenario                           pCTR
🔥 Viral Combo (Camp 1, Creat 5...)  25.4482%
💩 Junk Traffic (Xiaomi + UC)        8.1655%
😐 Baseline (Ordinary User)          2.0014%
--------------------------------------------------
```

### Bittersweet Results

**The Good News**: The model finally "got it"!
*   **Accurate Viral Identification**: The prediction soared from 7% in the LR era to **25.45%**. This shows DeepFM keenly captured the value of the golden combination: Campaign 1 + Creative 5.
*   **Baseline Normalized**: The prediction for ordinary users landed steadily at **2.00%**, perfectly replicating the global baseline CTR we set.

**The Mystery**: That **"Junk Traffic"**, why is it still **8.17%**?
This is clearly a garbage combination I deliberately constructed (Xiaomi + UC), which theoretically should have been banished to the cold palace. How is its score 4 times higher than the baseline user (2.00%)?

## Deep Post-Mortem: The Hegemony of Geographic Dividends

Is the model stupid again? No, after another deep analysis, I found **the model isn't stupid, it's just too "realistic".**

Let's look at the ingredients of this "Junk Traffic":
*   **Device**: Xiaomi (Negative)
*   **Browser**: UC (Negative)
*   **Country**: **CN (China)**

And in my training data, **the overall CTR for CN is far higher than other countries.**

DeepFM's logic goes like this:
> "Although this user is using Xiaomi, and the browser is UC, which are indeed negatives. But! He comes from **China**! In China, the probability of any random click is much higher than in the US. The deduction from the device simply cannot offset the huge bonus brought by 'being in China'."

This is the **Feature Weight Hegemony** revealed by deep learning: when the signal strength of a high-frequency feature (like Country) is enough to crush other long-tail features (like Device Model), the model will exhibit this kind of "big picture view."

It's telling me: **In the face of absolute traffic dividends, slightly worse equipment really doesn't matter.**

## The Victory of Relative Values

If we look at it from another angle, DeepFM actually did its best.

*   Under the same **CN** environment:
    *   **Viral Combo**: 25.45%
    *   **Junk Combo**: 8.17%

**Look! Starting from the same line, DeepFM has already slashed 2/3 of the score for the junk traffic!** This shows it successfully identified the negative impact of "Xiaomi + UC". It's just that because the "China" base is too high (High Base Score), even after chopping off 2/3, the remaining absolute value is still higher than an ordinary user in the US (Low Base Score).

## Conclusion

This DeepFM experiment not only showed me the power of deep models but also taught me a vivid data science lesson:

1.  **Models Don't Lie**: It faithfully reflects the probability distribution in the data. If you think the result is counter-intuitive, it's usually because your intuition ignored certain background probabilities (Base Rate).
2.  **Absolute vs. Relative**: When comparing pCTR across regions and scenarios, comparing absolute values directly often leads to misunderstandings. A more scientific approach is to look at **Lift** or conduct A/B Tests within the same dimension.

The current DeepFM model is already a "money printing machine" capable of accurately identifying viral hits (25% pCTR). Next step, I'm going to export this big guy to ONNX and stuff it into Node.js to see if its inference speed can keep up with the rhythm of RTB!
