---
title: "Who Says Node.js Can't Handle Core Algorithms? I Made It Work with ONNX and BigQuery"
date: 2026-02-13T09:15:00+08:00
tags:
- adtech
- nodejs
- bigquery
- machine-learning
categories:
- adtech
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> When I decided to refactor OpenAdServer using Node.js, the biggest skepticism often came from the algorithm side: "Can Node.js run deep learning models?" "Can the serving performance keep up?" Indeed, in an AI landscape dominated by Python, Node.js seems a bit out of place. But as a full-stack engineer, I was determined to see if Node.js could shoulder the heavy lifting of predicted Click-Through Rate (pCTR) by leveraging the power of ONNX and BigQuery.

<!--more-->

![cover](assets/cover.jpg)

## The Leap from CPM to CPC

After refactoring OpenAdServer with Node.js, the most exciting challenge was implementing **predictive capabilities** to enable more complex bidding strategies. Basic CPM (Cost Per Mille) is relatively simple, requiring just a straightforward bid. However, to support the industry-standard **CPC (Cost Per Click)** and **CPA (Cost Per Action)**, we have to scale two major peaks: **pCTR (predicted Click-Through Rate)** and **pCVR (predicted Conversion Rate)**.

Without these two predictions, advertisers are essentially flying blind, and our ad server would be nothing more than a "counter" that just tallies numbers.

## Resurrecting Two-Year-Old Code

The first step is always the hardest. I dug up the original version of OpenAdServer written in Python two years ago, which contained three pCTR models based on the Kaggle Criteo competition dataset. It's a classic dataset where features are anonymized into two categories: Dense (numerical) and Sparse (categorical).

Facing this dusty code, the dependency environment had long since changed beyond recognition. Fortunately, with AI assistants like Vibe Coding, fixing version conflicts and API changes was surprisingly easy. Soon, the training process was running locally again. Watching the Loss curve steadily decline, I knew we had a fighting chance.

## The Node.js Serving Dilemma (and Solution)

If I had stuck with Python for serving, things would have been much simpler given the highly unified ecosystem. But the core goal of this refactor was **Full Stack Node.js**. This wasn't just to unify the tech stack, but to squeeze every bit of asynchronous I/O performance out of Node.js in high-concurrency Real-Time Bidding (RTB) scenarios.

So, the question arose: How do you run a model trained in PyTorch or TensorFlow inside Node.js?

The answer is **ONNX (Open Neural Network Exchange)**.

ONNX acts like the "universal currency" of the AI world. It allows us to train models in Python, export them as `.onnx` files, and then perform efficient inference in Node.js using the `onnxruntime-node` library.

To verify feasibility, I first built a **Logistic Regression (LR)** model demo:
1.  Train an LR model in Python using Criteo data and export it to ONNX.
2.  Load the model in Node.js.
3.  Map a subset of request fields to the model's Dense/Sparse inputs, filling missing values with defaults.

The results were thrilling! Node.js successfully loaded the model and outputted prediction scores. This proved that the **Python Training -> ONNX Exchange -> Node.js Inference** pipeline is completely viable.

## Feature Engineering: What Determines a Click?

With the pipeline established, the next step was feeding the model real data. After careful consideration, I refined the core feature set for OpenAdServer:

*   **Traffic Side**: `device`, `browser`, `os`, `ip`, `country`, `city`, `referer`
*   **Ad Side**: `campaign_id`, `creative_id`, `banner_width`, `banner_height`, `slot_type`, `video_duration`
*   **Transaction Side**: `bid`, `cost`, `bid_type`
*   **User Side**: `user_id`

These data points form the skeleton of every `Impression`, `Click`, and `Conversion`.

## Why BigQuery?

Data collection is the bedrock of any recommendation system. I initially considered Redis: store the Request, and retrieve it upon Click callback. But Redis is a KV store; for analytical needs like "fetch historical data from the past 7 days for batch training," it’s a disaster.

I also considered ClickHouse, which has powerful real-time analytics capabilities. But ultimately, I chose Google Cloud's **BigQuery**. The reasons were simple:
1.  **Serverless**: No maintenance, works out of the box.
2.  **Ecosystem Integration**: Native support for Vertex AI, so no need to move data around.
3.  **SQL ML**: You can even train simple models directly using SQL.

To ensure real-time performance, I used the **BigQuery Storage Write API** and designed a **micro-batching** queue on the Node.js side: accumulate a certain number of logs or wait for a minute before flushing to BigQuery in a batch. This ensures timeliness while saving on API call quotas.

## Black Magic in SQL: Attribution Windows

Once the data is in, how do we turn it into training samples? This requires powerful SQL capabilities. With the help of Vibe Coding, we wrote a SQL logic to join scattered `Request` and `Click` logs via `click_id` and split the data into `TRAIN` and `VALIDATE` sets.

```sql
WITH 
-- 1. Base Request Extraction (Banner Only)
base_requests AS (
  SELECT
    click_id,
    user_id,
    campaign_id,
    creative_id,
    slot_id,
    page_context,
    device,
    browser,
    os,
    country,
    city,
    banner_width,
    banner_height,
    bid_type,
    bid,
    event_time,
    -- Time Feature Extraction
    EXTRACT(HOUR FROM event_time) AS req_hour,
    EXTRACT(DAYOFWEEK FROM event_time) AS req_dow,
    -- Data Split Logic
    CASE 
      WHEN event_time < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR) 
           AND event_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) THEN 'TRAIN'
      WHEN event_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR) 
           AND event_time < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 0 HOUR) THEN 'VALIDATE'
      ELSE 'IGNORE' -- Ignore data that is too old or too new
    END AS data_split
  FROM `analytics.ad_events`
  WHERE event_type = 9  -- REQUEST
    AND slot_type = 1   -- BANNER ONLY
    AND campaign_id > 0 -- Filter empty fills
),

-- 2. Base Click Extraction (Deduplication)
base_clicks AS (
  SELECT
    click_id,
    1 AS is_clicked
  FROM `analytics.ad_events`
  WHERE event_type = 2 -- CLICK
  QUALIFY ROW_NUMBER() OVER(PARTITION BY click_id ORDER BY event_time) = 1
)

-- 3. Final Assembly
SELECT
  r.*,
  COALESCE(c.is_clicked, 0) AS label
FROM base_requests r
LEFT JOIN base_clicks c ON r.click_id = c.click_id
WHERE r.data_split != 'IGNORE'
  AND r.click_id IS NOT NULL
```

This SQL directly generates a wide table, serving not just as data cleaning, but as the first step of feature engineering.

## Cloud Training and Version Hell

The final step was cloud automation. I debugged the code on Vertex AI Workbench, used Google's **Buildpacks** to automatically build a Docker image, and deployed it as a Cloud Run Job.

Everything looked perfect until—

`Error: Failed to load model...`

This was the biggest pitfall I encountered: **Version Incompatibility**. Local dev environment, Colab environment, Vertex AI environment, `onnxruntime-node` version... if just one didn't match, the ONNX model might fail to load.

After countless attempts, I finally locked it down to **PyTorch 1.13.1**. Only the ONNX model exported under this specific version could be perfectly recognized by my Node.js service.

## Conclusion: Taking the First Step

Although the model's performance isn't remotely ready for commercial use due to the small volume of test data, this loop of **Node.js + ONNX + BigQuery** has been successfully closed. It proves that even in a field as latency-sensitive as advertising technology, Node.js still has a fighting chance.

What's next? I'll try generating more realistic simulation data to make this model's "AUC" truly rise!
