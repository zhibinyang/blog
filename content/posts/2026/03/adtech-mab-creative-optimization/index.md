---
title: "告别玄学投放：用多臂老虎机 (MAB) 重塑广告创意优化"
date: 2026-03-05T12:00:00+08:00
tags:
- machine-learning
- data-science
- adtech
categories:
- data-science
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> 大家都觉得接入大模型就能搞定广告创意分发，但真实的工业级流量分发面对的是高维、长尾的结构化点击数据，这绝非目前 LLM 的强项。剥开“算法玄学”的外衣，其背后必然是确定且精妙的数学设计。本文将基于 Kaggle 的 Avazu CTR 数据集，硬核拆解从 Thompson Sampling（汤普森采样）、UCB 到 Linear Thompson Sampling 的底层逻辑与业务取舍。

<!--more-->

![封面图](assets/cover.jpg)

在正式讲解算法之前，有必要先交代一下环境背景。由于本地开发环境的内存限制，直接加载 6GB 的 Avazu 原始点击流数据会面临巨大的工程挑战。

因此，我们在正式投喂给算法模拟器之前，先做了一轮**流式聚合**与**维度降维**。我们利用 `chunksize` 将数据按小时（`dt`）进行聚合，并把特定的特征列（如 `C14`）识别为我们的“动作空间（Arms）”。同时，清洗掉诸如 `banner_pos` 等过多的环境噪声，将数据归一化到纯净的 `dt + C14` 颗粒度上，为后续算法的“反事实推理”提供了一个干净的反馈环境。

---

## 第一层级：Thompson Sampling 的贝叶斯抽签逻辑

如何让静态数据“动”起来？这是构建算法模拟器需要跨过的最关键的思维门槛。

传统日志往往只能回答“展示了 A 创意，点击了没有”。想要评估 Bandit 系统，我们需要模拟出连续的在线反馈过程。在这里，我们通过**拒绝采样 (Rejection Sampling)** 模拟 Agent 每小时的决策，并仅从历史日志中拉取对应的反馈。更重要的是，我们使用了**蒙特卡洛模拟 (Binomial Sampling)**，不再是每次点击加 1 个 reward，而是基于真实的曝光数模拟成百上千次的点击反馈。这使得 Beta 分布发生了“置信度坍缩”，极大地加速了算法收敛。

### 贝叶斯的三重属性

在 Thompson Sampling (TS) 的实现中，核心引擎其实就是围绕 `np.random.beta` 函数展开的。它完美地将决策分解为三个层次：

1. **均值右移（利用）**：表现好的素材（创意），其 $\alpha$ 会增加，在抽样中爆出高分的概率也会增大。
2. **方差收缩（止损）**：随着样本量的累积，Beta 分布会变得异常尖锐。表现差的素材，其分布会迅速坍缩到极低区间，被系统边缘化。
3. **长尾探索（探索）**：对于样本量极少的新素材，尽管其当前计算出的均值可能很低，但由于分布呈现“矮胖”状，仍有不小的概率抽得极高的随机分，从而获得曝光的机会。

> **工程实战小 Tips**  
> 将原本“每小时更新一次”的逻辑改为按曝光数的“二项分布更新”，收敛速度可以提升十倍以上；同时，对于突然掉 0 的素材，TS 会有一定的滞后性，实际工业落地时通常会补丁上“衰减因子”或熔断机制。

以下是支持按曝光量“批量二项分布更新”以大幅加速收敛的 Thompson Sampling 核心实现：

```python
import numpy as np

class ThompsonSamplingAgent:
    def __init__(self, ad_ids):
        self.ad_ids = ad_ids
        # 初始化 Beta 分布参数：alpha=1, beta=1 代表均匀分布（完全无知）
        self.alphas = {ad_id: 1 for ad_id in ad_ids}
        self.betas = {ad_id: 1 for ad_id in ad_ids}

    def select_ad(self):
        """
        采样阶段：从每个广告的当前 Beta 分布中随机抽取一个值，选最大的那个
        """
        samples = {
            ad_id: np.random.beta(self.alphas[ad_id], self.betas[ad_id])
            for ad_id in self.ad_ids
        }
        return max(samples, key=samples.get)

    def update(self, ad_id, clicks, misses):
        """
        学习阶段：根据真实反馈批量更新后验分布
        """
        # 核心优化：接受批量 click 和 misses，大幅加速收敛
        self.alphas[ad_id] += clicks
        self.betas[ad_id] += misses
```

有了支持批量更新的 Agent，最核心的工程实现则是如何在我们聚合的连续数据流中跑起**反事实回测（Backtesting）**。为了让时间流转起来，并在有限内存里完成极其密集的探索，我们不能对着单次曝光日志一行行做 `np.random.rand()` 判定。取而代之的，是利用二项分布 `np.random.binomial` 根据该小时该素材的真实曝光总量和点击率，算出一整批次的模拟随机点击数。这就是能十倍加速收敛的工程奥秘：

```python
# 在时间步循环内，Agent 对所有曝光素材评估后...
if not match_row.empty:
    actual_ctr = match_row.iloc[0]['ctr']
    # 获取该素材在当下这个小时内的真实总曝光数
    n_impressions = int(match_row.iloc[0]['impressions'])

    # --- 核心优化：一次性蒙特卡洛模拟 n 次曝光产生的点击数 ---
    # 宏观上等价于跑了 n 次是否点击的判断，极大缓解计算瓶颈
    simulated_clicks = np.random.binomial(n=n_impressions, p=actual_ctr)
    simulated_misses = n_impressions - simulated_clicks

    # 一次性将成百上千次反馈批量通知给 Agent，发生快速的"置信度坍缩"
    agent.update(chosen_ad, simulated_clicks, simulated_misses)
```

经过上述机制运转后，系统必然走向一种完美的“马太效应”状态：真正具有爆炸转化潜力的优质创意将被系统牢牢锁定并获得极高的预估 CTR（例如稳定在 24.8% 以上的顶级素材）；而转化表现惨淡的差评素材，仅在试错极少次数之后便被无情边缘化。此时总体的累计遗憾（Cumulative Regret）曲线从初期剧烈飙升到后期归于平缓，也证明了 Agent 已经学会了像顶尖投手一般合理分配预算。

---

## 第二层级：直面 UCB 算法，确定性乐观与“难以翻身”的陷阱

体验过 TS 的概率随机之美后，下一个里程碑便是代表着 **“确定性乐观”** 的 UCB (Upper Confidence Bound) 算法。

UCB 的逻辑是极其刚直的。它的决策得分公式非常经典：**$Score = Mean + Confidence$ (均值 + 置信加分)**。核心哲学便是在不确定性面前保持“乐观”，系统会优先尝试那些曝光不足、潜力未知的长尾素材。为了保证算法在回测中的严谨性，必须在同等粒度（`dt + C14` 维度聚合）的数据面上进行对比实验。如果用了非聚合数据导致虚增了投放步数 $n_i$，会让置信加分过快坍缩，导致系统过早丧失探索的动力。

但在实战模拟中，UCB 暴露出了一个直击灵魂在痛点：**差的素材一旦被打上“低分”烙印，便再无翻身可能**。

以下是基于“均值+置信上限”逻辑的 UCB Agent 实现：

```python
import numpy as np

class UCBAgent:
    def __init__(self, ad_ids):
        self.ad_ids = ad_ids
        self.counts = {ad_id: 0 for ad_id in ad_ids}
        self.sums = {ad_id: 0.0 for ad_id in ad_ids}
        self.total_count = 0

    def select_ad(self):
        self.total_count += 1
        # 初始阶段：确保每个广告至少被投过一次，完全乐观
        for ad_id in self.ad_ids:
            if self.counts[ad_id] == 0:
                return ad_id

        scores = {}
        for ad_id in self.ad_ids:
            # 均值 (Exploitation)
            avg_ctr = self.sums[ad_id] / self.counts[ad_id]
            # 置信上限加分 (Exploration)
            # 公式: sqrt(2 * ln(Total_Steps) / Arm_Steps)
            delta = np.sqrt(2 * np.log(self.total_count) / self.counts[ad_id])
            scores[ad_id] = avg_ctr + delta
        return max(scores, key=scores.get)

    def update(self, ad_id, clicks, misses):
        n = clicks + misses
        self.counts[ad_id] += n
        self.sums[ad_id] += clicks
```

因为 UCB 缺乏类似贝叶斯分布那样的随机灵感机制，它的一切探索完全依赖确定性项的增长，而置信项往往随着总步数的对数级 ($ \ln(t) $) 变得极为缓慢。如果你观察对比实验曲线，你会发现这个“早期偏见”有极强的记忆性。

![TS vs UCB Regret](assets/ts-vs-ucb.png)

总结来看，UCB 更加适合可解释性要求极高、且动作空间稳定的环境；而在面临结构化数据噪音大、创意迭代频次极高、且极度渴求在混沌之中挖掘“黑马”的真实广告投放时，Thompson Sampling 会显得更为灵动与自如。

---

## 第三层级：Linear Thompson Sampling，对抗零散维度与冷启动魔咒

走到这一步，传统的打法——把每个创意视作黑盒、割裂其与外部环境之间联系的做法已经见顶了。真正的进阶挑战是：**广告表现从来不是静止的，它是随用户的设备 (device)、时间 (hour) 动态波动的。**

引入上下文约束，便是 Linear Thompson Sampling (LinTS) 的核心使命。它不再学习单一的 CTR 分布，而是学习一个复杂的参数向量 $\theta$，尝试通过线性代数的方式去捕捉不同特征组合对点击率的贡献增益。

为此，特征工程引入了岭回归（Ridge Regression）思想，构建基于多元正态分布的决策引擎（涵盖协方差阵的逆 $B$ 及特征响应向量 $f$）。但在具体挑选特征时，我们需要极度警惕“拆得太散了，CTR 就不准了”这种**维度灾难**。如果把原本紧凑的数据摊薄到无数的网格中，会引发严重的统计学信息失真。所以极其宝贵的工程经验是：“先跑通、再求精”，从 `device_type` 和 `time` 这少数几个核心强特征开始切入。

以下是引入特征上下文并结合岭回归更新矩阵的 Linear TS（包含支持全局先验的扩展类）核心实现：

```python
import numpy as np

class LinearTSAgent:
    def __init__(self, ad_ids, feature_dim, delta=0.1):
        self.ad_ids = ad_ids
        self.d = feature_dim
        # 为每个广告维护一个 B 矩阵 (协方差的逆) 和 f 向量 (权重累加)
        self.B = {ad_id: np.identity(self.d) for ad_id in ad_ids}
        self.f = {ad_id: np.zeros(self.d) for ad_id in ad_ids}
        self.v = delta  # 探索系数

    def get_feature_vector(self, row):
        # 极简特征：1 (截距) + device_type (类别编码) + hour (归一化)
        return np.array([1, row['device_type'], row['dt'].hour / 24.0])

    def select_ad(self, context_row):
        x = self.get_feature_vector(context_row)
        best_sample_score = -1
        best_ad = None

        for ad_id in self.ad_ids:
            # 1. 计算当前权重的均值 mu = B^-1 * f
            B_inv = np.linalg.inv(self.B[ad_id])
            mu = B_inv @ self.f[ad_id]

            # 2. 从多元正态分布中采样权重 theta (贝叶斯采样在多维空间的体现)
            theta_sample = np.random.multivariate_normal(mu, self.v**2 * B_inv)

            # 3. 计算个性化得分
            score = x @ theta_sample
            if score > best_sample_score:
                best_sample_score = score
                best_ad = ad_id
        return best_ad

    def update(self, ad_id, context_row, clicks, misses):
        x = self.get_feature_vector(context_row).reshape(-1, 1)
        n = clicks + misses
        # 实时岭回归参数更新
        # B = B + x*x' * n
        self.B[ad_id] += (x @ x.T) * n
        # f = f + x * clicks
        self.f[ad_id] += x.flatten() * clicks

class LinearTSWithPriorAgent(LinearTSAgent):
    """注入全局先验的 LinTS，缓解冷启动高探索成本"""
    def __init__(self, ad_ids, feature_dim, global_mu_prior=None):
        super().__init__(ad_ids, feature_dim)
        if global_mu_prior is not None:
            for ad_id in ad_ids:
                # 假设拦截项对应大盘平均经验，初始化 f 向量
                self.f[ad_id] = self.B[ad_id] @ global_mu_prior
```

当我们将 LinTS 与 Simple TS 放在同样的跑道上模拟测试时，常会碰到一个非常真实的现象：**在初期相当长的一段时间里，Linear TS 的 Regret 反而比 Simple TS 更高**。

![Simple TS vs Linear TS Regret](assets/simple-ts-vs-linear-ts.png)

这并非算法跑错了，而是揭示了上下文强化学习（Contextual Bandit）的残酷现实：**复杂的高维特征模型在冷启动阶段必须要付出极高的“探索学费”**。在局部数据量尚未足以支撑复杂的线性拟合矩阵 $B$ 之前，这种过于超前地捕捉环境异质性的行为，远不如不讲武德直接计算全局均值的全局策略（Simple TS）稳健。如果在该场景下，绝对优质素材带来的收益领先优势盖过了个性化路线带来的微小红利，复杂的特征建模反而成了徒增遗憾的拖油瓶。

那么要如何改变这种由于过度探索导致的高试错成本呢？

解酒药就是——注入“全局先验（Global Prior / Bias）”。针对初期盲目摸黑的阶段，赋予 Agent 一个基于大盘或部分历史经验提前归纳出的先验认知地基（层次贝叶斯框架）。此时 LinTS 只需要去学习广告表现相对于全局主线的“偏差部分”，这能极大减轻冷启动时期的探索负担！

![Linear TS with/without Prior Regret](assets/linear-ts-vs-linear-ts-with-prior.png)

---

## 结语：复杂模型架构与工程化折算的心法

梳理至此，一套工业级的 MAB 算法架构设计思维呼之欲出：

它绝不仅是“在纸上推导一种完美的概率公式”，而是在应对外部世界流量的不稳定性、计算时延、业务高维稀疏性与真金白银的试错成本间进行精巧制衡。
比如，在系统刚上线的冷启动真空期，果断采用 **Simple TS** 利用其极快的收敛能力迅速锁定头部素材。而当我们通过海量曝光为不同人群画像累积出扎实的数据沉淀后，再平滑地过渡切入 **Linear TS 或 LinUCB** 处理多维度的细粒度分发。这也正是每一名算法架构师在面对上千万峰谷曝光和错综复杂的长尾场景时，真正需要拥有的武器库和思维底牌。