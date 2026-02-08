---
title: "写 Operator 太累？我用 n8n + AI 捏了个 K8s 运维专家"
date: 2026-01-23T11:00:00+08:00
tags:
- k8s
- n8n
- ai
- lowcode
categories:
- ai
- ops
comment: true
---

> 上次我尝试用 Node.js 写了一个 "AI Native" 的 K8s Operator，效果不错，但维护起来还是有点“代码量”。作为一个追求极致效率（偷懒）的开发者，我在想：能不能把这些复杂的代码逻辑，变成 n8n 画布上拖拖拽拽的流程图？于是，我开发了一套 n8n 的 K8s 自定义节点，配合 AI Agent，直接把 "Automated Ops" 升级成了可视化的 "Low-Code Agentic Ops"。现在的故障排查，就像看一场 AI 导演的侦探剧。

在上一篇文章里，我验证了“AI + K8s Client”的可行性。既然 AI 能读懂 K8s API，那一定要把它封装在厚重的 Operator 代码里吗？

Operator 模式虽然强大，但对于很多临时的、探索性的运维任务来说，开发成本还是太高了。每次调整逻辑都要重新构建镜像、更新 Deployment。

**如果能把 K8s 的原子能力暴露给 n8n 这样的低代码平台，会发生什么？**

于是，我搓了这个项目：**n8n-nodes-smart-k8s**。

## 为什么要用 n8n 做 K8s 运维？

核心理由只有一个：**可视化的思维链（Chain of Thought）。**

在代码里，AI 的 "观察-思考-行动" 循环只是几行黑盒的 `console.log`。但在 n8n 里，每一个步骤都是一个清晰的 Node：

1.  **Webhook 触发**：接收 Prometheus 的告警。
2.  **AI Agent 节点**：分析告警，决定下一步查什么。
3.  **K8s Custom Node**：执行 `kubectl get events` 或 `kubectl logs`。
4.  **AI Agent 节点**：根据返回结果，决定是继续深挖还是尝试修复。
5.  **Human Approval**：发送 Slack 消息等待人类点击“批准”。

这一切，都在一张画布上实时呈现。

## 重新定义 K8s 节点能力

为了支撑这个场景，我开发的自定义节点不仅支持基础的 CRUD，还特意针对 AI SRE 场景做了强化。

### 1. 动态的 "Run & Capture"

AI 很多时候需要“试探性”地执行脚本。比如，“起一个临时的 Pod，安装 curl 和 netcat，去测试 Redis 的连通性”。

为此，我在 `run` 操作中实现了 `runPodAndGetOutput` 模式：它会自动创建一个临时 Pod，挂载你指定的命令和环境变量，等待执行完成，抓取日志，然后自动销毁 Pod。

这对 AI 来说简直是神器——它可以安全地在集群里“发射”各种探测器，而不用担心留下垃圾资源。

### 2. 结构化的全量信息

传统的 HTTP Request 节点调用 K8s API 拿到的是原始 JSON，动辄几千行。

我在节点里内置了类似 `kubectl` 的精简逻辑（基于 `@kubernetes/client-node`），比如 `get events` 会自动聚合相关联的事件，`get logs` 支持自动通过标签选择器定位 Pod。让 AI “吃”到的数据更加高信噪比。

## 从 "Code Native" 到 "Low-Code Native"

把运维逻辑从 Go/Node.js 代码迁移到 n8n Workflow，最大的质变在于**复用性**和**敏捷性**。

包含故障排查经验的不再是 git 里的 commit，而是一个个可以分享的 JSON Workflow 文件。社区里的 SRE 大佬可以分享他的“MySQL 慢查询排查流”，小白一键导入，配置一下 K8s 凭证，立刻拥有了专家的排查能力。

这可能才是 Agentic Ops 的终极形态：**AI 提供算力，Low-Code 提供骨架，人类专家提供灵魂（经验）。**

{{< github-link link="https://github.com/zhibinyang/n8n-nodes-smart-k8s" text="在Github上查看项目" >}}
