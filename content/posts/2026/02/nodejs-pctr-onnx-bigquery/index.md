---
title: "谁说 Node.js 做不了核心算法？我用 ONNX 和 BigQuery 把它跑通了"
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

> 当我决定用 Node.js 重构 OpenAdServer 时，最大的质疑声音往往来自算法侧：“Node.js 能跑深度学习模型吗？” “Serving 性能跟得上吗？” 确实，在 Python 统治的 AI 领域，Node.js 显得有些格格不入。但作为一个全栈工程师，我偏要看看，借助 ONNX 和 BigQuery 的力量，能不能让 Node.js 扛起广告点击率预测（pCTR）的大旗。

<!--more-->

![cover](assets/cover.jpg)

## 从 CPM 到 CPC 的跨越

OpenAdServer 用 Node.js 重构完成后，最让我兴奋的挑战莫过于通过引入 **预测能力** 来实现更复杂的出价方式。基础的 CPM (Cost Per Mille) 相对简单，只要单纯竞价即可；但要想实现业界最主流的 **CPC (Cost Per Click)** 和 **CPA (Cost Per Action)**，我们就必须迈过两座大山：**pCTR (predicted Click-Through Rate)** 和 **pCVR (predicted Conversion Rate)**。

没有这两项预测，广告主就像是在盲人摸象，而我们的广告服务器也只能是个只会数数的“计数器”。

## 复活两年前的代码

万事开头难。我翻出了两年前用 Python 写的 OpenAdServer 原始版本，里面包含了三个基于 Kaggle Criteo 竞赛数据集的 pCTR 模型。那是一个非常经典的数据集，特征被匿名化为 Dense（数值型）和 Sparse（类别型）两类。

面对这份积灰的代码，依赖环境早已面目全非。好在如今有了 Vibe Coding 这样的 AI 助手，修复版本冲突和 API 变更变得异常轻松。很快，训练流程在本地重新跑通了，看着 Loss 曲线稳步下降，我知道这一仗有的打。

## Node.js 的 Serving 困局与破局

如果继续沿用 Python 做 Serving，事情会简单很多，毕竟生态高度统一。但这次重构的核心目标是 **全栈 Node.js**。不仅是为了统一技术栈，更是为了在即时竞价（RTB）的高并发场景下，榨干 Node.js 的异步 I/O 性能。

那么问题来了：如何在 Node.js 里跑 PyTorch 或 TensorFlow 训练出来的模型？

答案是 **ONNX (Open Neural Network Exchange)**。

ONNX 就像是 AI 界的“通用货币”，它允许我们在 Python 中训练模型，导出为 `.onnx` 文件，然后通过 `onnxruntime-node` 库在 Node.js 中高效推理。

为了验证可行性，我先做了一个 **Logistic Regression (LR)** 模型 Demo：
1.  用 Python 基于 Criteo 数据训练 LR 模型，导出 ONNX。
2.  在 Node.js 中加载模型。
3.  将部分请求字段映射到模型的 Dense/Sparse 输入，缺失值用 Default 填充。

结果令人振奋！Node.js 成功加载并输出了预测分数。这证明了 **Python 训练 -> ONNX 交换 -> Node.js 推理** 这条链路是完全畅通的。

## 特征工程：到底什么决定了用户点不点？

链路通了，下一步是喂给模型真实的数据。经过深思熟虑，我梳理出了 OpenAdServer 的核心特征集：

*   **流量侧**：`device`, `browser`, `os`, `ip`, `country`, `city`, `referer`
*   **广告侧**：`campaign_id`, `creative_id`, `banner_width`, `banner_height`, `slot_type`, `video_duration`
*   **交易侧**：`bid`, `cost`, `bid_type`
*   **用户侧**：`user_id`

这些数据构成了每一次 `Impression`、`Click` 和 `Conversion` 的骨架。

## 为什么是 BigQuery？

数据收集是所有推荐系统的基石。起初我考虑过 Redis：存下 Request，点击时回调取出。但 Redis 是 KV 存储，对于“取过去7天的历史数据进行批量训练”这种分析型需求，简直是灾难。

我也考虑过 ClickHouse，它的实时分析能力极强。但最终，我选择了 Google Cloud 的 **BigQuery**。原因很简单：
1.  **Serverless**：无需维护，即开即用。
2.  **生态整合**：天生支持 Vertex AI，数据不用搬来搬去。
3.  **SQL ML**：甚至可以直接用 SQL 训练简单的模型。

为了保证实时性，我使用了 **BigQuery Storage Write API**，并在 Node.js 端设计了一个 **微批队列（Micro-batching）**：积攒一定数量的 log 或每隔一分钟，再批量 Flush 到 BigQuery。这既保证了时效性，又节省了 API 调用配额。

## SQL 里的黑魔法：归因窗口

数据进去了，怎么变成训练样本？这就需要强大的 SQL 能力了。借助 Vibe Coding，我们写了一段 SQL 逻辑，将分散的 `Request` 和 `Click` 日志，通过 `click_id` 关联起来，并划分了 `TRAIN` 和 `VALIDATE` 数据集。

```sql
WITH 
-- 1. 基础请求数据提取 (仅限 Banner)
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
    -- 时间特征提取
    EXTRACT(HOUR FROM event_time) AS req_hour,
    EXTRACT(DAYOFWEEK FROM event_time) AS req_dow,
    -- 数据切分逻辑
    CASE 
      WHEN event_time < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR) 
           AND event_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) THEN 'TRAIN'
      WHEN event_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR) 
           AND event_time < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 0 HOUR) THEN 'VALIDATE'
      ELSE 'IGNORE' -- 忽略太旧或太新的数据
    END AS data_split
  FROM `analytics.ad_events`
  WHERE event_type = 9  -- REQUEST
    AND slot_type = 1   -- BANNER ONLY
    AND campaign_id > 0 -- 过滤空填充
),

-- 2. 基础点击数据提取 (去重)
base_clicks AS (
  SELECT
    click_id,
    1 AS is_clicked
  FROM `analytics.ad_events`
  WHERE event_type = 2 -- CLICK
  QUALIFY ROW_NUMBER() OVER(PARTITION BY click_id ORDER BY event_time) = 1
)

-- 3. 最终组装
SELECT
  r.*,
  COALESCE(c.is_clicked, 0) AS label
FROM base_requests r
LEFT JOIN base_clicks c ON r.click_id = c.click_id
WHERE r.data_split != 'IGNORE'
  AND r.click_id IS NOT NULL
```

这段 SQL 直接生成了一张宽表，这不仅是数据的清洗，更是特征工程的第一步。

## 云端训练与版本地狱

最后一步是云端自动化。我在 Vertex AI Workbench 上调试好代码，利用 Google 的 **Buildpacks** 自动构建 Docker 镜像，并部署为 Cloud Run Job。

一切看起来都很完美，直到——

`Error: Failed to load model...`

这是我遇到的最大坑：**版本不兼容**。本地开发环境、Colab 环境、Vertex AI 环境、onnxruntime-node 的版本，只要有一个对不上，ONNX 模型就可能无法加载。

经过无数次尝试，我终于锁定了 **PyTorch 1.13.1**。只有在这个特定的版本下导出的 ONNX 模型，才能被我的 Node.js 服务完美识别。

## 结语：迈出第一步

虽然目前因为测试数据量小，模型的效果还远没到商用的程度，但这套 **Node.js + ONNX + BigQuery** 的闭环已经跑通。它证明了在广告技术这样对延时极度敏感的领域，Node.js 依然有一战之力。

下一步？我会尝试生成更真实的模拟数据，让这个模型的 "AUC" 真正涨起来！
