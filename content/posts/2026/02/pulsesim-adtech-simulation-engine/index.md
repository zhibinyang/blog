---
title: "上帝视角的数字孪生：我用 AI 导演了一场 AdTech 全链路仿真秀"
date: 2026-02-19T16:00:00+08:00
tags:
- adtech
- nodejs
- ai
categories:
- adtech
- ai
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> 在搭建完 OpenAdServer 投放系统后，我面临一个核心痛点：系统内只有零星的测试流量，缺乏大规模、高质量的数据来训练 pCTR 模型。如果只是简单地灌入随机数据，模型学到的只是白噪音。为了模拟真实的市场反馈，我决定设计并实现 PulseSim-2026 —— 一个具备“上帝视角”、由 LLM 担任总导演的 AdTech 数字孪生仿真引擎。

<!--more-->

![PulseSim Dashboard](assets/cover.jpg)

## 1. 项目初衷：解决“巧妇难为无米之炊”

做过广告技术（AdTech）的同学都知道，**数据是算法的燃料**。

在搭建完 **OpenAdServer** 投放系统后，我发现自己陷入了一个死循环：
* 没有流量，就没有日志。
* 没有日志，DeepFM 这种深度模型就训练不起来，只能随即瞎猜。
* 模型瞎猜，投放效果就差，更加没有真实流量愿意进来。

我意识到，如果只是写个 `for` 循环生成一堆 `Math.random()` 的随机数据，虽然能把数据库填满，但模型学到的全是**白噪音（White Noise）**。为了让 DeepFM 真正学会“什么样的人喜欢点什么样的广告”，我需要一整套**逻辑自洽**、**符合概率分布**甚至**带有市场情绪**的仿真数据。

于是，**PulseSim-2026** 诞生了。它不是一个简单的压测工具，而是一个拥有“上帝视角”的数字孪生引擎。

## 2. 演进之路：从静态脚本到持续脉冲

我的设计思路经历了从“生成文件”到“驱动流”的转变：

* **Ver 1.0：静态脚本**
  初期我写过一个一次性生成 20 万条日志的 Python 脚本。它解决了“量”的问题，但它是**静态**的。我无法观察到“晚高峰流量激增”对系统 I/O 的压力，也无法测试“跨天归因”的逻辑。

* **Ver 2.0：The Pulse (当前阶段)**
  我改用 **Node.js/TypeScript** 构建了一个异步状态机，以 **5 QPS** 的频率（可动态调整）持续向 AdServer 发起请求。
  * **Heartbeat Design**：这种持续的“脉冲”让整个 BigQuery 数据链路活了起来。 Looker 看板上的曲线开始跳动，我能实时看到 RTB 的响应延迟、曝光率和转化率的变化。

## 3. 核心亮点：LLM 驱动的“市场导演”模式

这是我最得意的设计。为了让模拟数据具有商业逻辑，我引入了 **Gemini LLM** 作为系统的“剧本导演”。

在 `src/director/director.ts` 中，我设计了一个 `Director-Cron` 任务。

### 逻辑自洽的剧本
每天凌晨 0 点，LLM 会结合当天的日期（如“周五”、“情人节”）和 AdServer 里的真实 Campaign 配置，编织一个市场故事。

> **Gemini 导演的剧本示例：**
> "今天是周五，临近周末，职场人士开始规划短途旅行。旅游类广告（Campaign #12）在 iOS 设备上的点击率预计提升 30%。同时，由于是工作日白天，PC 端流量保持稳定，但移动端在晚高峰会有爆发。"

### 特征偏移系数 (Multipliers)
LLM 不直接产生随机数，而是输出一组 **Traffic Trends** JSON 配置。例如：

```json
"traffic_trends": {
    "country_weights": [ { "code": "CN", "weight": 1.5 }, { "code": "US", "weight": 0.8 } ],
    "os_weights": [ { "name": "ios", "weight": 1.3 } ],
    "browser_weights": []
}
```

* **长期物理规律**：基准 CTR 设为 2% (`src/engine/probability.ts`)。
* **短期趋势波动**：LLM 的系数（如 `ios: 1.3`）作为乘数叠加在基准之上。

这种设计完美模拟了现实中的 **Data Drift（数据漂移）**。模型必须不断适应这些变化，才能因地制宜地给出高分。

## 4. 行为建模：用数学还原人性

我深知“均匀分布”是广告模拟的杀手。真实世界里，没有人是均匀分布的。

### 转化延迟的长尾分布 (Long-tail Lag)
用户点击广告后，往往不会立刻下单。为了模拟这种“犹豫期”，我在 `src/engine/pulse.ts` 中实现了一个**幂函数分布**的延迟逻辑：

```typescript
// 模拟 1分钟 ~ 24小时 的随机延迟
const MIN_DELAY = 60 * 1000;
const MAX_DELAY = 24 * 60 * 60 * 1000;

// 使用幂函数 Math.pow(r, 3) 制造长尾效应
// 80% 的转化会落在短时间内，但仍有长尾会拖到 20 小时后
const bias = Math.pow(Math.random(), 3);
const tailDelay = Math.floor(bias * (MAX_DELAY - MIN_DELAY));
```

这直接挑战了我在 BigQuery 中写的 **归因回溯 (Lookback Window)** 逻辑。如果我的 SQL 写得不对， tych 延迟转化的归因就会失败，ROAS 计算就会出错。这才是仿真的意义！

### 用户意图得分 (Intent Score)
通过 `ProbabilityEngine`，我赋予了不同画像用户不同的购买概率。例如，带有 `shopping` 兴趣标签的用户，其 CVR（转化率）会有 1.5 倍的加成。这样 Looker 看板上的 ROAS 数据就会呈现出业务关联性，而不是一团乱麻。

## 5. 工程严谨性：生产级环境的考量

作为架构师，我不仅关注算法，更关注系统在 GCE 上的长期运行稳定性。

* **热加载与连续性 (Hot-Reloading)**
  我利用 `fs.watch` 监听 `daily_script.json` 变化。
  ```typescript
  private watchScript() {
      fs.watch(this.scriptPath, async (event) => {
          if (event === 'change') await this.loadScript();
      });
  }
  ```
  这意味着，当 LLM 在零点更新“今日剧本”时，模拟器**无需重启**。正在内存队列中等待触发的“延迟转化”事件不会丢失，跨天归因链条不会断裂。

* **成本控制**
  为了防止 LLM 消耗过多 Token，我 implemented 了 Hash 校验。只有当 AdServer 的 Targeting 规则发生实质性变化时，才触发 LLM 重新生成剧本，否则复用旧规则。

* **自愈能力**
  为了应对演示需求，我预留了手动触发 API。当我修改了 AdServer 配置后，可以一键强制触发 LLM 同步，实现“按需仿真”。

---

## 结语

PulseSim-2026 是我构建 AdTech 闭环中最有趣的一环。它不再是被动的数据生成器，而是一个有生命的、甚至有点“戏精”的数字世界。

在这个世界里，LLM 是编剧，Node.js 是舞台，而 BigQuery 和 AI 模型则是台下的观众，试图从这些光怪陆离的表演中，总结出一点点关于“人性”的数学规律。

{{< github-link link="https://github.com/zhibinyang/openadserver-pulsesim" text="在Github上查看项目" >}}
