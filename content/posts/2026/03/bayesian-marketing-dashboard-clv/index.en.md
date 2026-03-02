---
title: "From Prediction to Action: Building a Bayesian CLV Marketing Dashboard with 3 Charts"
date: 2026-03-02T16:11:00+08:00
tags:
- data-science
- pymc-marketing
- clv
categories:
- data-science
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> After exploring how *Think Bayes* perfectly maps the Bayesian intuition behind the BG/NBD model in my previous post, we can finally shift our focus from cold probability formulas to the fiery frontlines of business. As a data practitioner, I know that handing over a bunch of complex "posterior distributions" and "Gamma/Beta parameters" to business teams usually just results in eye rolls. They don't care about your derivations; they want three soul-searching answers based on that dataset with millions of purchase records (I'm using the classic Online Retail II UCI dataset here): **Who's churning and should we save them? Is our revenue base stable? Should I push someone to buy more often or spend more?**
>
> After a deep discussion with AI, I built a "Bayesian Marketing Decision Dashboard" consisting of three highly actionable charts. These charts break down the opaque information provided by CLV (Customer Lifetime Value) across three dimensions: **Status Diagnostics**, **Structural Risk**, and **Growth Paths**, instantly transforming them into tactical guidance.

<!--more-->

![cover](assets/cover.jpg)

## Chart 1: Survival vs. Value Matrix

* **X-Axis:** Expected 90-day LTV (Log scale alignment)
* **Y-Axis:** $P(\text{Alive})$, or the customer's current "survival probability"

I like to call this first chart the **"Casualty Assessment and Triage Table"**. In the BG/NBD world, customers don't suddenly bid you farewell; their silence just stretches out longer and longer (Recency). The core purpose of this chart is to help you define your **defensive** outreach timing.

```python
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from matplotlib.ticker import ScalarFormatter

# 1. Set classification thresholds
p_alive_threshold = 0.6
clv_threshold = rfm_df['pLTV_90d'].median()

# Ensure no 0 or negative values (required for log scale)
plot_data = rfm_df.copy()
plot_data['pLTV_90d'] = plot_data['pLTV_90d'].clip(lower=0.01)

# 2. Plot scatter diagram
plt.figure(figsize=(12, 8))
sns.scatterplot(data=plot_data, x='pLTV_90d', y='p_alive', alpha=0.4, color='teal', edgecolor=None)

# 3. Apply log scaling (critical)
plt.xscale('log')

# 4. Add quadrant partition lines
plt.axhline(y=p_alive_threshold, color='red', linestyle='--', alpha=0.6)
plt.axvline(x=clv_threshold, color='red', linestyle='--', alpha=0.6)

# 5. Annotate quadrant names
plt.text(clv_threshold * 1.2, 0.85, 'Champions', fontsize=11, color='darkgreen', fontweight='bold')
plt.text(clv_threshold * 0.1, 0.85, 'Potential', fontsize=11, color='blue', fontweight='bold')
plt.text(clv_threshold * 1.2, 0.15, 'At Risk Whales', fontsize=11, color='red', fontweight='bold')
plt.text(clv_threshold * 0.1, 0.15, 'Lost', fontsize=11, color='gray')

# 6. Styling
plt.gca().xaxis.set_major_formatter(ScalarFormatter()) 
plt.title('P(Alive) vs. Expected LTV Matrix (Log Scale)', fontsize=15, pad=20)
plt.xlabel('Predicted LTV (Log Scale)', fontsize=12)
plt.ylabel('Probability of Being Alive', fontsize=12)
plt.grid(True, which="both", ls="-", alpha=0.1)

plt.show()
```

![alive](assets/alive.png)

**Key Business Actions:**
* **At Risk Whales (Bottom Right):** These are the high rollers who used to contribute massively, but their survival probability has now dropped below the threshold! The strategy here is **immediate triage**. You need to deploy your highest-tier resources (calls from dedicated account managers, massive unconditional vouchers) to pull them back.
* **Champions (Top Right):** Your core cash-printing moat. The strategy is **maintenance and protection**. Exclude them from your user-acquisition ads to stop wasting money, and prioritize them for high emotional-value perks in your loyalty programs.
* **Potential (Top Left):** They're still around, but their spend is low. This is the perfect segment for **cross-selling**.

## Chart 2: Lorenz Curve (Value Concentration)

* **X-Axis:** Cumulative % of customers sorted by expected LTV in descending order
* **Y-Axis:** Cumulative % of total expected LTV contributed

If the previous chart was about saving lives in the ER, this Lorenz Curve is the **"Annual Financial Health Check"** at the business level. It quantifies just how fragile your revenue structure really is.

```python
import numpy as np
import matplotlib.pyplot as plt

# 1. Prepare data: sort by pLTV in descending order
sorted_ltv = rfm_df['pLTV_90d'].sort_values(ascending=False).values
cum_ltv = np.cumsum(sorted_ltv) 
total_value = cum_ltv[-1]
cum_ltv_pct = (cum_ltv / total_value) * 100

# 2. Prepare X-axis: cumulative customer percentage
cust_pct = np.arange(1, len(sorted_ltv) + 1) / len(sorted_ltv) * 100

# 3. Plotting
plt.figure(figsize=(10, 6))
plt.plot(cust_pct, cum_ltv_pct, label='pLTV Cumulative Contribution', color='darkorange', lw=3)

# 4. Add high-value reference lines
top_5_val = cum_ltv_pct[int(len(cum_ltv_pct)*0.05)]
plt.axvline(x=5, color='gray', linestyle='--', alpha=0.6)
plt.axhline(y=top_5_val, color='gray', linestyle='--', alpha=0.6)

# Add baseline diagonal (absolute equality)
plt.plot([0, 100], [0, 100], 'k--', label='Baseline', alpha=0.3)

# 5. Annotation
plt.annotate(f'Top 5% Customers\ncontribute {top_5_val:.1f}% Value',
             xy=(5, top_5_val), xytext=(15, top_5_val-10),
             arrowprops=dict(facecolor='black', shrink=0.05, width=1))

plt.title('pLTV Concentration Curve (Risk Assessment)', fontsize=14)
plt.xlabel('Cumulative % of Customers (Sorted by Value)', fontsize=12)
plt.ylabel('Cumulative % of Total Predicted LTV', fontsize=12)
plt.legend()
plt.grid(True, alpha=0.2)
plt.xlim(0, 100)
plt.ylim(0, 100)
plt.show()
```

![risk](assets/risk.png)

**Key Business Actions:**
* **Structural Risk Hedging:** If you see an extremely steep curve (e.g., the top 5% of users contribute over 50% of future expected value), your business is suffering from extreme "whale dependency". You absolutely must build a "Private Banking VIP Response System" similar to what traditional banks use.
* **Drawing Resource Thresholds:** Look for the "inflection point" where the curve starts to level off. Use this boundary to scientifically define the spending threshold for your "Black Card Members." This ensures the high cost of personalized operations is spent only on the few who actually generate hard cash.

## Chart 3: Quantity vs. Quality Map

* **X-Axis:** Expected future purchase frequency
* **Y-Axis:** Expected LTV

The first chart determines **whether to reach out**, but this third chart dictates **what exactly to send them**. It's an **offensive** tactical roadmap that brutally dissects whether a customer is valuable because they buy frequently (high frequency) or because they spend heavily per order (high AOV whales).

```python
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from matplotlib.ticker import ScalarFormatter

# 1. Process data for dual log-axes
plot_df = rfm_df.copy()
epsilon_p = plot_df['expected_purchases_90d'].median() * 0.01
epsilon_v = plot_df['pLTV_90d'].median() * 0.01

plot_df['expected_purchases_90d'] = plot_df['expected_purchases_90d'].clip(lower=epsilon_p)
plot_df['pLTV_90d'] = plot_df['pLTV_90d'].clip(lower=epsilon_v)

# 2. Plot bubble scatter
plt.figure(figsize=(12, 8))
scatter = sns.scatterplot(
    data=plot_df, 
    x='expected_purchases_90d', 
    y='pLTV_90d', 
    size='pLTV_90d', 
    hue='pLTV_90d',
    sizes=(30, 600), 
    alpha=0.5, 
    palette='magma', 
    edgecolor=None
)

# 3. Enable dual log scale
plt.xscale('log')
plt.yscale('log')

# 4. Median split lines
x_med = rfm_df['expected_purchases_90d'].median()
y_med = rfm_df['pLTV_90d'].median()
plt.axvline(x_med, color='red', linestyle='--', alpha=0.5, label='Median Frequency')
plt.axhline(y_med, color='red', linestyle='--', alpha=0.5, label='Median pLTV')

# 5. Formatting
for axis in [scatter.xaxis, scatter.yaxis]:
    axis.set_major_formatter(ScalarFormatter())

# 6. Four-quadrant tactical guide annotations
plt.text(x_med * 1.5, y_med * 5, 'TOP-TIER VIPs\n(Power Users)', color='darkred', fontweight='bold', fontsize=11)
plt.text(x_med * 0.1, y_med * 5, 'WHALE LAGGARDS\n(High Value, Low Freq)', color='blue', fontweight='bold', fontsize=11)
plt.text(x_med * 1.5, y_med * 0.2, 'LOYAL LOW-SPENDERS\n(Sticky but Low Margin)', color='green', fontweight='bold', fontsize=11)
plt.text(x_med * 0.1, y_med * 0.2, 'MARGINAL USERS\n(Low Priority)', color='gray', fontweight='bold', fontsize=11)

plt.title('Quantity vs. Quality: Strategic LTV Decomposition', fontsize=16, pad=20)
plt.xlabel('Expected 90d Purchase Frequency (Log Scale)', fontsize=12)
plt.ylabel('Predicted 90d LTV (Log Scale)', fontsize=12)
plt.grid(True, which="both", ls="-", alpha=0.1)

plt.show()
```

![quantity](assets/quantity.png)

**Key Business Actions:**
* **Whale Laggards (Top Left, High Value per Order):** Their pain point is a **lack of frequency**. They spend big, but might go six months between purchases. The tactic here is *Nudging*: send them "exclusive weekly/monthly refill subscriptions" or short-fuse reminder coupons to forcefully shorten their repurchase cycle.
* **Loyal Low-Spenders (Bottom Right, The Long Tail):** Their pain point is **low Average Order Value (AOV)**. These deal-hunters check in every day but never spend much. The tactic here is *Upselling* and *Bundling*. Try pushing a "Spend $500, Get $100 off" campaign to deliberately raise their per-order water mark.

## Conclusion: Making Algorithms Speak Human

Through these three layers of unraveling, we've evolved from the black-box opacity of `BetaGeoModel` and MCMC Traces into a god-mode perspective that can issue direct strategic commands for both individual users and macroeconomic trends. Together, they form a closed-loop **Bayesian Marketing Science System**:

* **Chart 1** decides: **Should we issue a coupon right now?**
* **Chart 2** reveals: **Is our total revenue base at risk of collapsing?**
* **Chart 3** finalizes: **Should this coupon offer a discount on a single item, or promote a bundle deal?**

Next step? If you're chasing more advanced attribution insights, try pulling **time-sliced snapshot comparisons** across different campaign periods (which also relies on lifetimes/PyMC's capabilities to filter predictions at historical points). You'll finally see if those massive marketing budgets actually pushed low-activity users into the `Champions` tier, or if you simply wasted money rewarding big buyers who were already `VIPs`.
