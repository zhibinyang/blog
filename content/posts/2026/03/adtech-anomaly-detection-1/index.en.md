---
title: "Farewell to False Alarms! AdTech Anomaly Detection: The Evolution from 3-Sigma to Isolation Forest"
date: 2026-03-03T16:00:00+08:00
tags:
- anomaly-detection
- machine-learning
- data-science
- adtech
categories:
- data-science
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> Conversion rates plummeting daily, but your monitoring alerts play dead when they should fire, and scream bloody murder when everything is fine? This post dives into a real-world risk control scenario dealing with massive datasets. Watch how I sifted through tens of millions of ad impressions, discarded the impractical 3-Sigma, pushed past the bottlenecks of MAD, and finally used Isolation Forest to accurately pinpoint the "culprits" hiding in granular traffic dimensions! If you're being tortured by a screen full of false alarms, this practical guide might give you some inspiration.

Have you ever experienced this kind of despair: staring at the global monitoring dashboard, you notice the overall ad CVR (Conversion Rate) has dropped significantly, but the alert system is completely silent. Then, you manually adjust the thresholds, only to be bombarded by hundreds of "crying wolf" false alarms in the middle of the night...

In the AdTech space, which is notorious for extreme noise and long-tail effects, trying to find hidden anomalies in tens of millions of click streams is like finding a rusty needle in a haystack.

Today, I grabbed a slice of the classic **TalkingData** dataset from Kaggle—over 20 million click records covering about 6 hours of real business traffic. To test the waters, I intentionally "stole" some conversions in specific dimensions (like a particular OS) to poison the data. I wanted to see if our "conventional weapons" actually work. This is the starting point of this series (Anomaly Detection Series Part 1).

<!--more-->

![cover](assets/cover.jpg)

## Level 1: The Obsession and Disillusionment with 3-Sigma

Bring up anomaly detection, and even a junior data analyst will blurt out: **3-Sigma! Standard deviation!**

Its theory is incredibly sexy: assuming a normal distribution, the probability of falling outside $3\sigma$ is a mere 0.27%. If it's pure random fluctuation, this is a highly unlikely event; once a data point falls outside the guardrails, something is wrong with the system.

However, after aggregating CVR into 5-minute windows and using a Rolling Window to calculate the mean and standard deviation, reality hit me hard.

Ad traffic isn't a smooth stream; it's a mudslide. The data inherently contains massive spikes and noise. When we use strictly "mean-based" approaches, a massive outlier will pull the entire moving average line up and widen the standard deviation. The result? **The anomaly ends up swallowing itself, effectively becoming the new normal** (threshold self-adaptive drift).

When I tried to tweak the rolling logic to make it more sensitive, the natural jitters caused by varying base click volumes instantly painted my dashboard red. Across just 84 time windows, it easily fired off a screen full of false positives. Final verdict: Without "scrubbing" the data first, 3-Sigma is an absolute nightmare here.

Here is the 3-Sigma implementation code for reference:

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def detect_baseline_anomalies_v2(df, window_size='5min', sigma=3):
    # 1. Ensure timestamps are converted and set as index
    df = df.copy()
    df['click_time'] = pd.to_datetime(df['click_time'])
    df = df.set_index('click_time')

    # 2. Aggregate CVR by window
    ts = df['is_attributed'].resample(window_size).mean().fillna(0)

    # 3. Calculate Rolling Statistics
    rolling_mean = ts.rolling(window=6).mean().shift(1)
    rolling_std = ts.rolling(window=6).std().shift(1)

    upper_bound = rolling_mean + (sigma * rolling_std)
    lower_bound = rolling_mean - (sigma * rolling_std)

    # 4. Identify anomalies
    anomalies = ts[(ts > upper_bound) | (ts < lower_bound)]
    
    return anomalies
```

![3-sigma](assets/3-sigma.png)

## Level 2: The Breakwater of MAD (Median Absolute Deviation)

Since the "mean" was constantly being skewed by bad data, what if we switched to the much more resilient **"median"**?

The MAD algorithm is essentially a robust upgrade to 3-Sigma. Instead of calculating variance, it computes the absolute deviation of each data point from the median, and then takes the median of those differences.

The practical results were highly encouraging. Once I introduced a **"Noise Floor"** and **sample size filtering**, MAD's guardrails became incredibly stable. No matter how spiky the traffic became, it held its ground perfectly, filtering out a huge batch of false alarms and only flagging the genuine anomalies that clearly breached the boundaries.

**But there's a fatal flaw:** it can only tell you "the global metrics are broken."
The global baseline breaks, but which exact channel, operating system (OS), or application (App) is causing it? If you try to drill down into finer granularities to investigate, the data becomes heavily fragmented. Conversion fluctuations wild out, and MAD falls right back into the swamp of false positives. It's like a motion sensor telling you someone is stealing your stuff, but it can't give you a description of the thief.

Below is the optimized MAD implementation incorporating the "Noise Floor" and "Sample Size Filtering":

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def detect_anomalies_mad_v2(df, window_size='5min', sigma=3, lookback_points=6, min_clicks=100):
    """
    Industrial-grade MAD anomaly detection implementation
    :param df: Raw DataFrame (must contain click_time and is_attributed)
    :param window_size: Aggregation time window
    :param sigma: Deviation multiplier (analogous to 3-sigma)
    :param lookback_points: Historical points to look back (e.g., 12 points of 5min = 1 hour)
    :param min_clicks: Minimum clicks threshold to trigger an alert
    """
    # 1. Data preprocessing
    data = df.copy()
    data['click_time'] = pd.to_datetime(data['click_time'])
    data = data.set_index('click_time').sort_index()

    # 2. Dimensional aggregation (CVR and Total Clicks)
    ts = data['is_attributed'].resample(window_size).agg(['mean', 'count']).fillna(0)
    cvr = ts['mean']
    clicks = ts['count']

    # 3. Robust baseline calculation (Rolling MAD)
    rolling_median = cvr.rolling(window=lookback_points).median().shift(1)

    def get_mad(x):
        return np.median(np.abs(x - np.median(x)))

    rolling_mad_raw = cvr.rolling(window=lookback_points).apply(get_mad).shift(1)

    # Set a minimum deviation floor: 15% of the global average CVR,
    # preventing the guardrails from becoming too narrow during perfectly smooth periods
    noise_floor = cvr.mean() * 0.15

    # 4. Calculate thresholds (1.4826 is the scaling factor for normal distribution)
    scale_factor = 1.4826
    lower_bound = rolling_median - (sigma * scale_factor * rolling_mad_raw) - noise_floor
    upper_bound = rolling_median + (sigma * scale_factor * rolling_mad_raw) + noise_floor

    # 5. Anomaly identification
    is_outlier = (cvr < lower_bound) | (cvr > upper_bound)
    is_significant = (clicks >= min_clicks)
    anomalies = cvr[is_outlier & is_significant]

    return anomalies
```

![mad](assets/mad.png)

## Level 3: Dimensional Strike — Unearthing the Mole with Isolation Forest

If we hit a dead end counting "distance from the mean," it's time to change the rules of the game entirely.

If the previous two methods focus on how far you are from the main pack, **Isolation Forest** takes a completely different angle: **it checks if your specific combination of traits makes you a "freak."** As long as you are rare and abnormal enough, when the algorithm randomly partitions the space, it takes very few cuts to isolate you. Uniquely, this mechanism inherently doesn't care whether your data resembles a normal distribution or not.

Furthermore, it's an absolute beast at handling **multi-dimensional** spaces. I threw the entire `['os', 'app', 'channel']` combination at it. 
Initially, feeding unaggregated raw data containing tens of millions of rows nearly melted my CPU. However, after pivoting to "group by time window and specific dimensions," calculating the CVR and impression counts, and then feeding that engineered data in—it showcased jaw-dropping performance!

**Then came the moment that truly blew me away.** Remember the targeted "poisoned data" I injected at the start? Amidst an ocean of thousands of combinations, Isolation Forest used multi-dimensional scoring and RCA (Root Cause Analysis) attribution to ruthlessly pinpoint `os=19` (where the cliff-drop occurred) as well as the exact anomalous Channels, all mapped out with clear timelines.

In the resulting "time audit report," Isolation Forest didn't just tell us *when* the anomaly started; it handed us a ranked "suspect list."

**It didn't need us to pre-specify which OS to look at! This is its true value as a "radar" — automated drill-down auditing.**

Finally, here is the optimized Isolation Forest code that supports multi-dimensional RCA drill-down and introduces the **Business Loss (Conv_Loss)** evaluation:

```python
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder

def rca_business_impact_scanner(df, dimensions=['os', 'app', 'channel'], window='5min', min_clicks=100):
    all_candidates = []
    df = df.copy()
    df['click_time'] = pd.to_datetime(df['click_time'])
    
    print(f"--- Firing up Business Impact Audit (Window: {window}) ---")
    
    for dim in dimensions:
        # 1. Dimensional Aggregation
        agg = df.groupby([pd.Grouper(key='click_time', freq=window), dim]).agg(
            cvr=('is_attributed', 'mean'),
            clicks=('is_attributed', 'count'),
            conversions=('is_attributed', 'sum')
        ).reset_index().sort_values(['click_time', dim])
        
        # 2. Compute Baseline CVR (Rolling median, 6 windows lookback)
        # This defines what the "healthy state" looks like
        agg['baseline_cvr'] = agg.groupby(dim)['cvr'].transform(
            lambda x: x.rolling(window=6, min_periods=1).median().shift(1)
        ).fillna(agg['cvr']) # Fill the first point with itself

        # 3. Calculate Conversion Drop Volume (Delta Conversions)
        # Loss > 0 means lost conversions; Loss < 0 means overperforming conversions
        agg['conv_loss'] = (agg['baseline_cvr'] - agg['cvr']) * agg['clicks']
        
        # 4. Filters and Feature Preparation
        agg_filtered = agg[agg['clicks'] >= min_clicks].copy()
        if len(agg_filtered) < 10: continue

        # 5. Isolation Forest Detection: Adding conv_loss as a core feature
        X = agg_filtered[['cvr', 'conv_loss', 'clicks']].copy()
        model = IsolationForest(n_estimators=100, contamination=0.01, max_samples=256, n_jobs=-1, random_state=42)
        model.fit(X.values)
        
        agg_filtered['is_anomaly'] = model.predict(X.values)
        
        # 6. Extract anomalies and sort by actual business loss
        anomalies = agg_filtered[agg_filtered['is_anomaly'] == -1].copy()
        if not anomalies.empty:
            # We only care about positive losses (i.e. conversion drops)
            anomalies = anomalies[anomalies['conv_loss'] > 0]
            
            top_hits = anomalies.sort_values(by='conv_loss', ascending=False).head(5)
            for _, row in top_hits.iterrows():
                all_candidates.append({
                    'Dimension': dim.upper(),
                    'Value': row[dim],
                    'Time': row['click_time'],
                    'Clicks': row['clicks'],
                    'Actual_CVR': f"{row['cvr']:.4%}",
                    'Baseline_CVR': f"{row['baseline_cvr']:.4%}",
                    'Conv_Loss': round(row['conv_loss'], 2) # How many conversions were lost
                })

    if not all_candidates:
        print("✅ No critical anomalies causing severe business data loss found.")
        return None

    result_df = pd.DataFrame(all_candidates).sort_values(by='Conv_Loss', ascending=False)
    print("\\n🏆 [Business Impact Leaderboard (Ranked by Estimated Lost Conversions)]")
    print(result_df.head(10).to_string(index=False))
    return result_df

# Run the scanner
impact_report = rca_business_impact_scanner(df_poisoned)
```

Sample Output

🏆 Business Impact Leaderboard (Ranked by Estimated Lost Conversions)

| Dimension | Value | Time | Clicks | Actual CVR | Baseline CVR | Conv_Loss |
| --- | --- | --- | --- | --- | --- | --- |
| **OS** | **19** | 2017-11-07 12:00:00 | 58,779 | 0.0323% | 0.2275% | **114.75** |
| **OS** | **19** | 2017-11-07 12:10:00 | 58,518 | 0.0273% | 0.2039% | **103.34** |
| **OS** | **19** | 2017-11-07 12:05:00 | 55,754 | 0.0538% | 0.2156% | **90.19** |
| CHANNEL | 101 | 2017-11-07 10:10:00 | 15,213 | 0.3221% | 0.6327% | 47.26 |
| CHANNEL | 101 | 2017-11-07 10:05:00 | 10,639 | 0.4230% | 0.8425% | 44.64 |
| **OS** | **19** | 2017-11-07 12:15:00 | 54,013 | 0.0444% | 0.1248% | 43.40 |
| CHANNEL | 213 | 2017-11-07 15:55:00 | 704 | 8.8068% | 14.7690% | 41.97 |
| CHANNEL | 274 | 2017-11-07 16:25:00 | 156 | 24.3590% | 48.5811% | 37.79 |
| APP | 35 | 2017-11-07 12:05:00 | 145 | 43.4483% | 68.4963% | 36.32 |
| OS | 13 | 2017-11-07 13:55:00 | 59,436 | 0.0892% | 0.1472% | 34.51 |

## Summary & What's Next

1. **3-Sigma** is a great entry-level toy for quickly profiling your data, but in the face of non-normal, highly volatile AdTech data streams, it’s mostly just making you feel good while doing nothing.
2. **MAD** is phenomenal as a core moat for your global metrics. It is highly resistant to false positives, but it completely lacks the deconstructive capability needed to pinpoint granular dimensions.
3. **Aggregated Isolation Forest** is the silver bullet for hunting multi-dimensional combinatorial anomalies. Even when you are completely in the dark about what specifically broke, it can isolate the most highly suspicious "dimensional slice" straight out of tens of millions of logs.

But the story is far from over. In real-world operations, fraudsters' tactics are constantly evolving, and Isolation Forest can sometimes be a bit sluggish in detecting gradual, covert drop-offs over time. In **Anomaly Detection Series (Part 2)**, I'll take you through time-series forecasting and bring out the heavier algorithmic artillery. Stay tuned!
