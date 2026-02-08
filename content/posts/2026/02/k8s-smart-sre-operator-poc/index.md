---
title: "谁说 Operator 必须用 Go 写？我用 Node.js + AI 搓了个 K8s 自动运维专家"
date: 2026-01-05T10:00:00+08:00
tags:
- k8s
- operator
- ai
- nodejs
- genkit
categories:
- ai
- ops
comment: true
---

> 以前写 Kubernetes Operator，满脑子都是 Informer、Workqueue 和复杂的 Go 模板代码。这次我换了个思路：能不能用最熟悉的 Node.js，配合 Google 的 GenKit 框架，给 K8s 集群装一个“会思考”的大脑？于是 `k8s-smart-sre-operator` 诞生了。它不像传统 Operator 那样死板地执行 `if-err != nil`，而是像一个 24 小时在线的资深 SRE，不仅能通过 CRD 定义调试策略，还能自主通过“观察-思考-行动”的思维链来排查故障，甚至自动生成修复补丁。本文带你拆解这个“AI Native”运维工具的核心实现。

在云原生圈子里，写 Operator 似乎默认就是 Go 语言的专利。Kubebuilder 很强大，但对前端或 Node.js 全栈开发者来说，门槛依然存在。

更重要的是，传统的 Operator 逻辑是“硬编码”的。你必须预判所有可能的错误情况，写死对应的处理逻辑。但现实世界的故障往往千奇百怪，**我们需要的是一个能“随机应变”的 Operator。**

所以，我写了这个 POC 项目：**k8s-smart-sre-operator**。

## 核心架构：当 Operator 遇上 AI Agent

这个项目的核心逻辑非常直观，由两部分组成：

1.  **控制面（The Body）**：基于 `@kubernetes/client-node` 实现的轻量级 Operator 循环。
2.  **思考面（The Brain）**：基于 **GenKit** 实现的 AI Agent，内置了 SRE 的思维模型。

### 1. 并非所有的 Pod 都需要 AI

AI 虽好，但也不能滥用。为了避免 AI 对着所有 Crash 的 Pod 疯狂输出，我设计了一个 `DebugPolicy` CRD（自定义资源）。

这就像是给 AI 下达的“出警指令”。你可以定义：只监控 `production` 命名空间下，标签带有 `app: payment` 的 Pod。

```yaml
apiVersion: example.com/v1
kind: DebugPolicy
metadata:
  name: protect-critical-services
spec:
  rules:
    - namespaces: ["default"]
      selector:
        matchLabels:
          app: critical-app
```

当 Operator 也就是 `Reconciler` 监测到符合策略的 Pod 进入 `CrashLoopBackOff` 或 `Pending`（调度失败）状态时，它不会立刻干预，而是创建一个 `DiagnosticReport`（诊断报告）。

### 2. AI 的“观察-思考-行动”循环

`DiagnosticReport` 被创建后，状态为 `Analyzing`。这时，Operator 会调用 GenKit 的 Flow，唤醒 AI Agent。

我在 System Prompt 里不仅告诉 AI “你是一个资深 SRE”，还强制要求它遵循 **Reasoning Chain（思维链）**：

*   **Observation（观察）**：看到什么数据？
*   **Thought（思考）**：这意味着什么？假设是什么？
*   **Action（行动）**：下一步调用什么工具验证？

为了让 AI 能“干活”，我封装了一套 `k8s-reader` 工具集给它。

#### 场景一：Pod 一直 Pending

*   **AI 观察**：Pod 状态是 Pending，事件显示 `FailedScheduling`。
*   **AI 思考**：调度失败通常是因为资源不足或亲和性规则不满足。我需要检查节点资源和 Pod 定义。
*   **AI 行动**：调用 `get_resource_usage(nodeName)` 查看节点负载，同时调用 `inspect_object` 查看 Pod 的 `resource requests`。
*   **AI 结论**：节点内存不足。

#### 场景二：应用启动崩溃

*   **AI 观察**：Pod 处于 `CrashLoopBackOff`。
*   **AI 思考**：应用启动失败，必须看日志。
*   **AI 行动**：调用 `fetch_logs(podName)` 抓取最近 100 行日志。
*   **AI 发现**：日志里报错 `Connection refused to redis:6379`。
*   **AI 结论**：Redis 连接失败，怀疑配置错误。

### 3. Human-in-the-loop：AI 建议，人类批准

最酷的地方来了。AI 分析完后，不会直接瞎改集群（那是灾难）。

它会生成一份结构化的报告，包含：
1.  **Findings**：根因分析摘要。
2.  **Reasoning Chain**：它的完整推导过程。
3.  **Suggested Patch**：一个标准的 JSON Patch 字符串。

Operator 会把这些信息回写到 `DiagnosticReport` status 里，并将状态更为 `AwaitingApproval`。

作为运维人员，你只需要 `kubectl get diagnosticreport`，看看 AI 的分析对不对。如果觉得靠谱，将状态改为 `Approved`。Operator 监测到批准信号，通过 `client-node` 直接将 Patch 应用到集群，完成自动修复。

## 为什么选择 Node.js？

很多人问，做云原生为什么不用 Go？

1.  **生态亲和性**：AI Agent 的编排（如 LangChain.js, GenKit）在 Node.js 生态中非常活跃且易用。
2.  **开发效率**：对于这种偏“胶水逻辑”的 Controller，JS 的 JSON 处理能力和事件驱动模型写起来非常舒服。
3.  **动态性**：JS 的动态特性使得处理各种非结构化的 AI 输出和 K8s 资源对象（本质都是 JSON）时，比强类型的 Go 少了很多样板代码。

## 结语

`k8s-smart-sre-operator` 展示了一种可能：未来的运维自动化，不再是写死一堆 `if pod.status == 'Error'`，而是教会 AI 怎么像人一样去查问题。

我们正在从 **Automated Ops**（自动化运维）迈向 **Agentic Ops**（智能体运维）。在这个过程里，Operator 不再是执行脚本的机器，而是成为了连接 AI 大脑和基础设施肢体的神经中枢。
