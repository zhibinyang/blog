---
title: "破除 ID 迷思：基于 Milvus 与 Gemini 的双塔 Look-alike 系统重构实践"
date: 2026-03-09T09:00:00+08:00
tags:
- machine-learning
- data-science
- adtech
- vector-database
categories:
- data-science
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> 在移动营销的洪流中，寻找“对的人”始终是核心命题。然而，当传统的 ID 匹配在隐私保护和数据破碎的浪潮中逐渐失效时，仅靠历史点击来圈选 Look-alike 人群已经不够用了。我们需要撕开表层数据的伪装，深入挖掘行为意图与语义理解的双重回响。本文将带你跳出传统思维，硬核复盘如何利用大模型和向量模型，从海量噪音中提炼出真正高价值的“数字孪生”。

<!--more-->

![封面图](assets/cover.jpg)

在广告优化系统的鄙视链里，总有人觉得只要把数据倒进大模型里，AI 自然会把高价值的用户端给你。

实际上呢？真实的移动端点击数据从来不是排列整齐的教科书。它是破碎的快照（Snapshots）、是充满了设备误触和低质采样点的巨大噪音池。在流量越来越贵、买量成本不断攀高的今天，如果你的 Look-alike（相似人群扩展）系统还只停留在对 Device ID 的机械匹配，或者单纯依靠统计学概率画圈圈，那么你注定只能捞到别人漏下的残渣。

这一次，我决定放弃传统路线。我想要打造一套能够同时洞察 **行为意图（Behavioral）** 与 **语义理解（Semantic）** 的双向检索引擎。这就是基于 **BigQuery + App2Vec + Gemini + Milvus** 的双塔 Look-alike 系统探索全纪实。

## 第一阶段：时空挖掘——在云端重塑“意图流”

探索的起点是那份超过亿级规模的原始日志（TalkingData）。原始数据充满冗余，就像是被打碎的毛玻璃。

### 核心洞察：Compute Pushdown & 事件级压缩

为了处理这样的数据，最忌讳的就是把所有噪音直接拖回本地强撸。我将计算逻辑下推至 **BigQuery**。这绝不仅仅是为了加速普通的 `JOIN` 操作，核心在于我设计了一套 **“事件级篮子压缩（Event-level Basket Compression）”** 算法：

*   **状态去重：** 识别用户在连续采样点中的“背景活跃”，只保留意图发生实质变化（例如使用的 App 篮子成员改变）的关键节点。
*   **时序对齐：** 通过类似 `ARRAY_AGG` 的高级计算，保证行为轨迹的严格时序，将碎片化的海量日志还原为一条条连续而平滑的“意图流”。

**技术底线：** 顶级的算法从来都是始于干净的数据。在分布式 SQL 层面解决噪音，其 ROI 远比在模型层面对抗过度拟合要高得多。

## 第二阶段：行为之塔——App2Vec 的“语言学”实验

完成了数据提纯后，我们要如何刻画一个人？如果把一个用户的 App 使用序列看作一句话，那么 App 就是这条意图流里的单词。

### App2Vec：捕捉潜意识的偏好

利用 **Word2Vec (Skip-gram)** 架构，我开始构建用户的行为轨道。这并非新鲜概念，但细节在于我们如何处理特征聚合。

在模型学习到独立 App ID 之间的“共现”规律后，我们不能简单地将它们加和平均。为了生成代表业务现状的用户向量，系统必须引入**时间衰减池化 (Time-decay Pooling)** 的理念：

$$V_{user} = \frac{\sum (V_{app\_i} \times W_{recency})}{\sum W_{recency}}$$

越靠近当下的行为，权重 $W_{recency}$ 越高。这让我们的 128 维行为向量不仅拥有刻画长期画像的厚度，更具备了对即时意图的极度敏锐。

## 第三阶段：语义之塔——LLM 赋予的“行业常识”

但纯粹基于行为共现的模型存在一个致命的物理规律：**冷启动（Cold Start）失明**。

当遇到没有任何历史行为记录的新 App，或是刚刚接入系统的新用户时，Skip-gram 网络没有任何边可以连，系统会在这个节点瞬间失算。

### 从 ID 到含义的降维打击

为了打破这个屏障，我引入了 **Gemini Embedding** 来构建另一条独立的语义轨道。

*   **语义锚定：** 将脱敏的用户列表，关联至他们触碰过的底层行业标签集合（如 `finance`, `wealth_management`, `game_strategy` 等）。
*   **常识对齐：** 系统将这些由字符串堆叠的离散序列喂给 `gemini-embedding-001` 模型。Gemini 会依靠自身庞大的预训练认知，将干瘪的分类映射为充满“人类常识”的 768 维高维向量。

这就意味着，即便两个 App 从未被任何同一个用户点击过，只要它们在商业逻辑底层的语义相近，系统也能在向量空间里将受众群无缝拉近。这就是大模型带来的降维打击。

## 第四阶段：向量港口——Milvus 的“晚期融合”魔法

有了精准的 128 维行为向量和聪明的 768 维语义向量，真正的难题来了：如何让这两个维度完全不同、量纲不一致的特征塔协同工作？

我果断放弃了极其僵化的“静态拼接（Concat）”然后送进全连接层的老路子。我选择了灵活的 **Milvus 多向量架构**，并实施了最硬核的**应用层晚期融合（Late Fusion）**。

### 弃用黑盒，手动构建双路“调音台”

虽然一些向量数据库在迭代中引入了原生的混合检索，但在真实的工业级广告系统中，为了获得对召回与精排机制的绝对掌控力，有经验的架构师往往会选择**手动实现混合检索**。

在架构设计上，用户的行为 `behavior_vec` 和语义 `semantic_vec` 被分别独立建构为两套并行的 HNSW 索引列。其工程意义在于：**查询时的动态完全解耦与超强可控的调权**。

当请求打过来时，我们在代码中分别向两座向量塔发起快速并发检索，通过扩大召回倍数（Top $K \times 2$）来充盈候选池。随后在应用层的内存字典中，执行这批海量候选 ID 分数的暴力对齐与合并。

你可以想象面前有一个精密的调音台，在数据融合交汇的瞬间，系统可以根据当前的广告主投放目的（KPI），自由拨动 $\alpha$ 和 $\beta$ 这两个主控旋钮，基于自定义的公式实时计算出最终优先级得分：

$$Final\_Score = \alpha \times Score_{behavior} + \beta \times Score_{semantic}$$

*   **精准收割模式 ($\alpha=0.8, \beta=0.2$)：** 系统极其看重行为序列的咬合度，此时产出的用户 App Jaccard 重叠度极高，适合高转化的 ROI 冲刺。
*   **品牌拓客模式 ($\alpha=0.2, \beta=0.8$)：** 系统转而听从 Gemini 的语义建议，挖掘那些即使从来没用过相关竞品，但在底层标签语义上高度吻合的潜在心智人群，实现绝佳的破圈效果。

```python
def hybrid_search(collection, query_behavior_vec, query_semantic_vec, alpha=0.5, beta=0.5, top_k=10):
    # 1. 行为维度召回 (Behavior Tower)
    behavior_results = collection.search(
        data=[query_behavior_vec],
        anns_field="behavior_vec",
        param={"metric_type": "COSINE", "params": {"ef": 128}},
        limit=top_k * 2,  # 扩大召回池
        output_fields=["device_id"]
    )

    # 2. 语义维度召回 (Semantic Tower)
    semantic_results = collection.search(
        data=[query_semantic_vec],
        anns_field="semantic_vec",
        param={"metric_type": "COSINE", "params": {"ef": 128}},
        limit=top_k * 2,
        output_fields=["device_id"]
    )

    # 3. 晚期融合与基于公式的精排 (Late Fusion & Re-ranking)
    device_scores = {}
    
    # ... 分别提取打分并合并到 device_scores 字典中 ...

    final_results = []
    for device_id, scores in device_scores.items():
        # 核心：根据前台下发的 alpha 和 beta 实时计算融合分数
        final_score = alpha * scores.get('behavior', 0) + beta * scores.get('semantic', 0)
        final_results.append((device_id, final_score))

    # 按最终得分降序，截取 Top K 暴露给广告主
    final_results.sort(key=lambda x: x[1], reverse=True)
    return final_results[:top_k]
```

## 探索结论：1 + 1 > 2 的实证

这绝非键盘上的纸上谈兵。我在 10MB 抽样集的一轮完整回归测试中，抽取了一个包含 `consumer_loans`, `wealth_management`, `im`, `game` 等 53 个标签的高净值金融种子客户进行检索测试。

当执行 $\alpha=0.5, \beta=0.5$ 的等比例融合后，令人惊叹的结果出现了：这套系统召回的 Top 10 用户，不仅找出了在行为和语义上双杀的高分用户，更极具互补性地发掘了两类被单塔模型放弃的人群：
1. **意图明显的潜在股**（语义匹配度极高 > 0.92，但行为序列基本毫无交集，被传统模型无视）。
2. **纯粹的动作复刻者**（动作流极度相似，但可能只是一群不怎么打标签的低活跃账户）。

从量化指标上看，种子人群与找回人群的平均标签重叠度（Jaccard）稳定拉升到了 **60%-80%**，其业务潜力远超大盘随机池！

## 结语

这场从数据清洗、双塔映射到最后多向量检索的端到端重构，不仅是底层基建的推倒重来，更是对“数字孪生”这一概念的深度致敬。真正的 Look-alike 永远不该只是冰冷的 ID 克隆。我们需要的是：**人类业务意图**（Behavior）与**世界常识运转逻辑**（Semantic）在多维高维向量空间中的一次完美同频。