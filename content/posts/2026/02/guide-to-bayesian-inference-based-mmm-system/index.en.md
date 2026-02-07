---
title: Guide to Bayesian Inference based MMM System
date: 2026-02-06T17:30:13+08:00
tags:
- adtech
- mmm
- measurement
- bayesian
categories:
- adtech
- measurement
comment: true
---
> In the "post-cookie" era, traditional attribution is fading. Bayesian Marketing Mix Modeling (MMM) has emerged as the gold standard, blending expert priors with data to quantify true incremental impact. This guide deconstructs its statistical soul—from priors to saturation curves—empowering you to master marketing ROI amidst uncertainty.


## 1. Core Philosophy: From "Regression" to "Causal Inference"

Traditional regression analysis (Frequentist) seeks a **fixed point estimate**, whereas Bayesian MMM treats all parameters as **probability distributions**.

* **Core Formula:**

$$Y = \alpha + \sum_{i} \beta_{i} \cdot \text{Transformed\_Ad}(X_{i}) + \sum_{j} \gamma_{j} \cdot C_{j} + \epsilon$$

* $Y$: Target Variable (Sales/Revenue).
* $\alpha$: **Intercept/Baseline** (Natural sales without advertising).
* $\beta_{i}$: **Media Coefficients** (Contribution weight of each channel).
* $\gamma_{j}$: **Control Variables** (Coefficients for control variables like seasonality, holidays, price discounts, etc.).
* $\epsilon$: **Error Term** (Observation noise).

## 2. Three Pillars of Bayesian Inference

### A. Prior Distributions (Priors) — "Mathematizing Expert Knowledge"

This is the most powerful aspect of Bayesian methods. You can feed your understanding of the advertising business into the model in advance.

* **Non-negativity Constraints:** Ad spend usually has a positive effect on sales. You can set a **Half-Normal** or **Exponential** distribution for $\beta$ to force the model not to draw absurd conclusions like "the more you spend, the lower the sales."
* **Weakly Informative Priors:** If you are completely unsure about a new channel (e.g., TikTok), you can set a wider distribution and let the data speak for itself.

### B. Likelihood Function — "Fit between Data and Model"

The model evaluates the probability of observing the actual sales data given the parameters. It is usually assumed that sales follow a normal distribution:

$$Y \sim \text{Normal}(\mu, \sigma)$$

Where $\mu$ is the predicted value calculated from the core formula above.

### C. Posterior Distribution (Posterior) — "Updated Knowledge"

Through Bayes' theorem:

$$P(\theta | \text{Data}) \propto P(\text{Data} | \theta) \times P(\theta)$$

The final output of the model is not a single ROI number, but a **range of ROI distributions**. For example: Google's ROI has a 95% probability of falling between $[1.2, 1.8]$.

## 3. AdTech Specific Non-linear Transformations

This is the core statistical step when PyMC-Marketing processes raw Spend data:

### A. Adstock (Lag Effect/Memory Decay)

Simulates the phenomenon of "saw the ad today, bought it next week." The most common is **Geometric Decay**:

$$X_{t}^{*} = X_{t} + \theta \cdot X_{t-1}^{*}$$

* $\theta$: Retention rate. The larger the $\theta$, the stronger the long-tail effect.

### B. Saturation (Saturation Effect/Diminishing Returns)

Simulates the logic that "doubling ad spend does not double sales." PyMC-Marketing commonly uses the **Hill Function**:

$$S(X) = \frac{X^{n}}{X^{n} + L^{n}}$$

* $L$: Half-saturation point (Input when sales reach half of the maximum value).
* $n$: Shape parameter (Determines the slope of the curve).

## 4. Sampling and Inference

Since the denominator (evidence factor) in the Bayesian formula is extremely difficult to calculate in high-dimensional space, **MCMC (Markov Chain Monte Carlo)** sampling is used.

* **NUTS (No-U-Turn Sampler):** PyMC's default advanced sampling algorithm.
* **Acceleration Logic:** **JAX + GPU**. JAX compiles sampling matrix operations via **XLA (Accelerated Linear Algebra)** to parallelize thousands of sampling iterations.

## 5. Model Evaluation Metrics

* $\hat{R}$: Convergence metric. If $\hat{R} < 1.01$, the model has converged and the results are credible.
* **ESS (Effective Sample Size):** If it is too small, it means the sampling quality is not high.
* **Divergences:** If the model reports this error, it means the Prior settings are too outrageous, or the data noise is too large.


## Summary

1. **Handling Small Samples:** Ad data is often weekly, so the data volume is small. Bayesian methods are more robust on small samples than deep learning.
2. **Uncertainty Quantification:** You can tell the boss "We are 80% confident that the ROI is greater than 1," which is more in line with business logic than giving a fake specific number.
3. **Interpretability:** Each term $\alpha$, $\beta$, $\theta$ has a clear physical meaning, directly corresponding to user acquisition, retention, and organic growth in the advertising business.
