---
title: "Tired of Writing Operators? I Built a K8s SRE Agent with n8n + AI"
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

> Last time, I tried writing an "AI Native" K8s Operator using Node.js. It worked well, but maintaining it still involved a fair amount of code. As a developer who strives for extreme efficiency (or just laziness), I wondered: could I turn these complex code logic into a drag-and-drop workflow on an n8n canvas? So, I developed a set of custom n8n Kubernetes nodes, paired them with an AI Agent, and upgraded "Automated Ops" to visual "Low-Code Agentic Ops". Now, troubleshooting feels like watching a detective drama directed by AI.

In my previous post, I validated the feasibility of combining AI with a K8s Client. But since AI can understand K8s APIs, does it absolutely have to be encapsulated within heavy Operator code?

While the Operator pattern is powerful, the development cost is too high for many ad-hoc, exploratory operations tasks. Every logic adjustment requires rebuilding the image and updating the Deployment.

**What happens if we expose atomic K8s capabilities to a low-code platform like n8n?**

That led me to create this project: **n8n-nodes-smart-k8s**.

## Why use n8n for K8s Operations?

There's one core reason: **Visual Chain of Thought.**

In code, the AI's "Observe-Think-Act" loop is just a few lines of black-box `console.log`. But in n8n, every step is a clear, visible Node:

1.  **Webhook Trigger**: Receive alerts from Prometheus.
2.  **AI Agent Node**: Analyze the alert and decide what to check next.
3.  **K8s Custom Node**: Execute `kubectl get events` or `kubectl logs`.
4.  **AI Agent Node**: Based on the results, decide whether to dig deeper or attempt a fix.
5.  **Human Approval**: Send a Slack message and wait for a human to click "Approve".

All of this is presented in real-time on a single canvas.

## Redefining K8s Node Capabilities

To support this scenario, the custom nodes I developed go beyond basic CRUD. I specifically enhanced them for AI SRE scenarios.

### 1. Dynamic "Run & Capture"

AI often needs to execute scripts "tentatively". For example, "start a temporary Pod, install curl and netcat, and test Redis connectivity".

To enable this, I implemented a `runPodAndGetOutput` mode in the `run` operation: it automatically creates a temporary Pod, mounts your specified commands and environment variables, waits for execution to complete, captures the logs, and then automatically destroys the Pod.

This is a game-changer for AI—it can safely "launch" various probes into the cluster without worrying about leaving behind garbage resources.

### 2. Structured Full Information

Traditional HTTP Request nodes calling K8s APIs return raw JSON, often thousands of lines long.

I built simplified logic into the node, similar to `kubectl` (based on `@kubernetes/client-node`). For instance, `get events` automatically aggregates related events, and `get logs` supports locating Pods via label selectors. This gives the AI data with a much higher signal-to-noise ratio.

## From "Code Native" to "Low-Code Native"

Migrating operations logic from Go/Node.js code to n8n Workflows brings a qualitative change in **Reusability** and **Agility**.

Troubleshooting experience is no longer contained in git commits, but in shareable JSON Workflow files. An SRE expert in the community can share their "MySQL Slow Query Troubleshooting Flow", and a beginner can import it, configure their K8s credentials, and instantly possess expert-level troubleshooting capabilities.

This might be the ultimate form of Agentic Ops: **AI provides the compute, Low-Code provides the skeleton, and Human Experts provide the soul (experience).**

{{< github-link link="https://github.com/zhibinyang/n8n-nodes-smart-k8s" text="View on GitHub" >}}
