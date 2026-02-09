---
title: "部署在 Cloudflare 上的带娃神器：用 LangGraph 打造后的周末救星"
date: 2025-06-15T10:00:00+08:00
tags:
- langchain
- langgraph
- cloudflare
- ai
categories:
- ai
- life
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> "爸爸，我们这就出发了吗？去哪里呀？" 
>
> 每到周六早晨，听到这个问题我的头皮就开始发麻。对于一个有些许"选择困难症"的理工男爸爸来说，规划完美的周末遛娃路线简直比修 Bug 还难。要考虑天气（会不会太晒？）、路况（堵不堵车？）、孩子的兴致（最近是不是又迷上奥特曼了？），还要避开人山人海。
>
> 终于在又一次因为这事儿被老婆吐槽后，我决定用我最擅长的方式解决问题——写代码。我利用 Cloudflare Workers 的免费额度和 LangGraph 的编排能力，给自己做了一个"AI 亲子旅行规划师"。

![cover](assets/cover.jpg)

## 为什么要自己造轮子？

市面上的 AI 聊天机器人（ChatGPT、豆包、Kimi）都很聪明，但它们都有一个通病：**"纸上谈兵"**。

当你问它："推荐一个适合 5 岁孩子玩的地方"，它会洋洋洒洒给你列出 "故宫、长城、颐和园"。
拜托，周六上午 10 点去故宫？票早没了，且由于人多，体验大概率是"看人头"。

我需要的不是一个"百度百科"，而是一个能像**真实助理**一样思考的 Agent：
1.  **先筛选**：别上来就查路况，先根据历史偏好挑几个候选地。
2.  **再确认**：等我选了感兴趣的，再去查具体的天气和路况。
3.  **有记忆**：记住我儿子不喜欢爬山，但对动物园情有独钟。

## 技术选型：穷鬼的快乐（Cloudflare + LangGraph）

作为一个业余项目，首要原则是**便宜**（甚至免费）和**易维护**。

*   **计算平台**：[Cloudflare Workers](https://workers.cloudflare.com/)。每天 10 万次免费请求，对于个人使用简直是"无限流量"。而且全球边缘部署，速度极快。
*   **编排框架**：[LangGraph.js](https://langchain-ai.github.io/langgraphjs/)。它的"State Graph"概念完美契合这类复杂的决策流程。
*   **记忆存储**：[Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)。免费的向量数据库，用来存孩子的喜好。
*   **模型**：兼容 OpenAI 接口的模型（我用了字节的豆包，便宜量大）。

## 核心逻辑：像人类一样规划

我在 `Planner Node` 里写了一套非常详尽的 System Prompt，强制 AI 遵守 **"分阶段规划" (Phased Planning)** 的原则。

### 第一阶段：广泛搜索与初筛

AI 首先会调用 `memory_retriever` 去向量数据库里翻旧账：
*   *"上次去了植物园，孩子好像觉得无聊。"*
*   *"用户标记过不喜欢超过 2 小时的车程。"*

结合这些"记忆"，它会先用 `baidu_search` 泛泛地搜一下"北京周边适合 5 岁孩子的自然风景区"。

**AI 的内心戏**：
> "用户想要自然风光，且不喜欢长途车。根据搜索结果，我在初筛列表中排除了古北水镇（太远），留下了野鸭湖和温榆河公园。"

### 第二阶段：有的放矢的精准查询

当我对"野鸭湖"表示感兴趣后，AI 才会进入第二阶段。这时候它才会调用那些"昂贵"的 API：
*   **高德地图 (`gaode_maps`)**：不仅仅是查距离，而是查**实时路况**和**过路费**。"现在出发，走京藏高速，预计 1 小时 20 分，一路畅通。"
*   **和风天气 (`qweather`)**：查**逐小时预报**。"下午 3 点可能会有阵雨，建议带伞或改为室内活动。"

这就是 LangGraph 的魅力：**它不是在瞎聊，而是在执行一个严谨的工作流**。

### 代码一瞥

这是我在 Graph 中定义的核心状态流转：

```javascript
const workflow = new StateGraph(ParentState)
    .addNode('agent', entry)
    .addNode('memoryRetriever', memoryRetrieverNode)
    .addNode('planner', plannerNode) // 核心大脑
    .addNode('toolExecutor', toolExecutorNode) // 工具人
    .addNode('summarizer', summarizerNode) // 总结对话
    .addNode('memoryRecorder', memoryRecorderNode ) // 提炼偏好
    
    // 逻辑连线
    .addEdge(START, 'agent')
    .addEdge('agent', 'memoryRetriever')
    .addEdge('memoryRetriever', 'planner')
    .addEdge('toolExecutor', 'planner') // 工具执行完回到 Planner 继续思考
```

## "越用越顺手"的秘密

这个 Agent 最让我满意的是它的 **Memory Recorder（记忆记录者）** 节点。

在每次对话结束后，会有一个通过 `lightLlm` (为了省钱用的便宜模型) 运行的后台任务，专门分析刚才的对话，提炼出 **"User Preference"**。

比如，在那次去完野鸭湖回来后，我和 Agent 吐槽了一句："蚊子太多了，下次不去水边了。"

下次我再问："周末去哪？"
AI 会立刻检索到这条记忆，并在思考过程中写道：
> *"检索到用户上次反馈不喜欢水边（怕蚊子），本次规划排除湿地类公园。"*

这种"被记住"的感觉，真的比任何高级算法都让人感动。

## 结语

现在，这个部署在 Cloudflare 上的小工具已经成了我家的"周末参谋长"。当然，技术只是辅助，最重要的还是放下手机，全身心地陪孩子去探索这个世界。

如果你也是个爱折腾的程序员奶爸/奶妈，不妨也试试给自己做一个？毕竟，没有什么比用代码解决生活中的"鸡毛蒜皮"更有成就感了。

{{< github-link link="https://github.com/zhibinyang/langchain-cloudflare" text="在Github上查看项目" >}}

---

*项目代码基于 Cloudflare Workers 模板构建，前端直接由 NextChat 等兼容 OpenAI 接口的客户端接入。*
