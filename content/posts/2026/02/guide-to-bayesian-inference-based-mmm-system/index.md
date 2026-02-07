---
title: 基于贝叶斯推断的营销组合建模 (MMM) 系统指南
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

> 在隐私保护增强的“后Cookie”时代，传统归因正面临失效。贝叶斯营销组合建模（MMM）凭借结合专家经验与数据的独特优势，成为衡量真实增量的核心利器。本指南将从统计学底层出发，深度拆解先验、延迟与饱和效应，助你在不确定性中锁定真实的投放投资回报。

## 1. 核心哲学：从“回归”到“因果推断”

传统的回归分析（Frequentist）寻找一个**固定的点估计**，而贝叶斯 MMM 将所有参数视为**概率分布**。

* **核心公式：**

$$Y = \alpha + \sum_{i} \beta_{i} \cdot \text{Transformed\_Ad}(X_{i}) + \sum_{j} \gamma_{j} \cdot C_{j} + \epsilon$$

* $Y$: 目标变量（Sales/Revenue）。
* $\alpha$: **Intercept/Baseline**（没有广告时的自然销量）。
* $\beta_{i}$: **Media Coefficients**（各渠道的贡献权重）。
* $\gamma_{j}$: **Control Variables**（季节、节日、价格折扣等控制变量的系数）。
* $\epsilon$: **Error Term**（观测噪声）。

## 2. 贝叶斯推断的三大支柱

### A. 先验分布 (Priors) —— “专家经验的数学化”

这是贝叶斯最强大的地方。可以把对广告业务的认知提前“喂”给模型。

* **非负性约束：** 广告费对销量通常是正向的，可以给 $\beta$ 设置一个 **Half-Normal** 或 **Exponential** 分布，强制模型不准得出“投钱越多销量越低”的荒谬结论。
* **弱信息先验：** 如果对某个新渠道（如 TikTok）完全没把握，可以设置一个较宽的分布，让数据说话。

### B. 似然函数 (Likelihood) —— “数据与模型的匹配度”

模型评估在给定参数下，观察到实际销售数据的可能性。通常假设销售额服从正态分布：

$$Y \sim \text{Normal}(\mu, \sigma)$$

其中 $\mu$ 就是上面那个核心公式算出来的预测值。

### C. 后验分布 (Posterior) —— “更新后的认知”

通过贝叶斯定理：

$$P(\theta | \text{Data}) \propto P(\text{Data} | \theta) \times P(\theta)$$

模型最终产出的不是一个 ROI 数字，而是一个 **ROI 的分布范围**。例如：Google 的 ROI 有 95% 的概率落在 $[1.2, 1.8]$ 之间。

## 3. 广告技术特有的非线性转换

这是 PyMC-Marketing 处理原始 Spend 数据时的核心统计步骤：

### A. Adstock (延迟效应/记忆衰减)

模拟“今天看到的广告，下周才买”的现象。最常用的是**几何衰减 (Geometric Decay)**：

$$X_{t}^{*} = X_{t} + \theta \cdot X_{t-1}^{*}$$

* $\theta$：留存率。$\theta$ 越大，长尾效应越强。

### B. Saturation (饱和效应/收益递减)

模拟“广告费翻倍，销量不翻倍”的逻辑。PyMC-Marketing 常用 **Hill Function**：

$$S(X) = \frac{X^{n}}{X^{n} + L^{n}}$$

* $L$：半饱和点（销量达到最大值一半时的投入）。
* $n$：形状参数（决定曲线的倾斜度）。


## 4. 采样与计算 (Inference)

由于贝叶斯公式中的分母（证据因子）在高维空间极难计算，使用 **MCMC (Markov Chain Monte Carlo)** 采样。

* **NUTS (No-U-Turn Sampler)：** PyMC 默认的高级采样算法。
* **加速逻辑：** **JAX + GPU**。JAX 将采样的矩阵运算通过 **XLA (Accelerated Linear Algebra)** 编译，并行化处理数千次采样迭代。


## 5. 模型评估指标

* $\hat{R}$:  收敛性指标。如果 $\hat{R} < 1.01$，说明模型已收敛，结果可信。
* **ESS (Effective Sample Size)：** 有效样本量。如果太小，说明采样质量不高。
* **Divergences (分歧点)：** 如果模型报这个错，说明Prior 设置得太离谱，或者数据噪声太大。


## 总结

1. **处理小样本：** 广告数据往往是周级的，数据量很少，贝叶斯在小样本上比深度学习更稳健。
2. **不确定性量化：** 可以告诉老板“我们有 80% 的信心保证 ROI 大于 1”，这比给一个虚假的确定数字更符合商业逻辑。
3. **可解释性：** 每一项 $\alpha$、$\beta$、$\theta$都有明确的物理含义，直接对应广告业务的拉新、留存和自然增长。
