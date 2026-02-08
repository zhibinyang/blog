---
title: "Who Says Operators Must Be Written in Go? I Built a K8s Auto-Ops Expert with Node.js + AI"
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

> When writing Kubernetes Operators, we often think of Informers, Workqueues, and complex Go template code. This time, I took a different approach: couldn't we use the familiar Node.js, paired with Google's GenKit framework, to install a "thinking" brain into a K8s cluster? And so, `k8s-smart-sre-operator` was born. Unlike traditional Operators that rigidly execute `if-err != nil`, it acts like a 24/7 senior SRE. It not only defines debugging policies via CRDs but also autonomously troubleshoots using an "Observe-Think-Act" chain of thought, and even automatically generates fix patches. This article breaks down the core implementation of this "AI Native" ops tool.

In the cloud-native world, writing Operators seems to be the exclusive domain of Go. Kubebuilder is powerful, but for frontend or Node.js full-stack developers, the barrier to entry remains high.

More importantly, traditional Operator logic is "hard-coded". You must anticipate every possible error scenario and hard-code the corresponding handling logic. But real-world failures are often bizarre and unpredictable. **We need an Operator that can "adapt to changes".**

So, I built this POC project: **k8s-smart-sre-operator**.

## Core Architecture: Operator Meets AI Agent

The core logic of this project is straightforward, consisting of two parts:

1.  **The Body (Control Plane)**: A lightweight Operator loop implemented based on `@kubernetes/client-node`.
2.  **The Brain (Thinking Plane)**: An AI Agent implemented based on **GenKit**, with an embedded SRE mental model.

### 1. Not Every Pod Needs AI

AI is great, but it shouldn't be abused. To prevent AI from spamming output for every crashing Pod, I designed a `DebugPolicy` CRD (Custom Resource Definition).

This is like an "intervention order" for the AI. You can define: only monitor Pods in the `production` namespace with the label `app: payment`.

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

When the Operator (specifically the `Reconciler`) detects that a Pod matching the policy enters a `CrashLoopBackOff` or `Pending` (scheduling failed) state, it doesn't intervene immediately but instead creates a `DiagnosticReport`.

### 2. The AI's "Observe-Think-Act" Loop

Once a `DiagnosticReport` is created, its status is `Analyzing`. At this point, the Operator calls the GenKit Flow to wake up the AI Agent.

In the System Prompt, I not only tell the AI "You are a senior SRE," but also enforce it to follow a **Reasoning Chain**:

*   **Observation**: What data do you see?
*   **Thought**: What does this mean? What is the hypothesis?
*   **Action**: What tool should be called next to verify?

To enable the AI to "do work," I encapsulated a `k8s-reader` toolset for it.

#### Scenario 1: Pod Stuck in Pending

*   **AI Observation**: Pod status is Pending, events show `FailedScheduling`.
*   **AI Thought**: Scheduling failure is usually due to insufficient resources or unsatisfied affinity rules. I need to check node resources and the Pod definition.
*   **AI Action**: Call `get_resource_usage(nodeName)` to check node load, and `inspect_object` to check the Pod's `resource requests`.
*   **AI Conclusion**: Node memory is insufficient.

#### Scenario 2: Application Crash on Startup

*   **AI Observation**: Pod is in `CrashLoopBackOff`.
*   **AI Thought**: Application failed to start, must check logs.
*   **AI Action**: Call `fetch_logs(podName)` to fetch the recent 100 lines of logs.
*   **AI Discovery**: Logs show error `Connection refused to redis:6379`.
*   **AI Conclusion**: Redis connection failed, suspect configuration error.

### 3. Human-in-the-loop: AI Suggests, Human Approves

Here comes the coolest part. After the AI finishes its analysis, it won't blindly mess with the cluster (that would be a disaster).

It generates a structured report containing:
1.  **Findings**: A summary of the root cause analysis.
2.  **Reasoning Chain**: Its complete deduction process.
3.  **Suggested Patch**: A standard JSON Patch string.

The Operator writes this information back to the `DiagnosticReport` status and updates the status to `AwaitingApproval`.

As an ops engineer, you just need to `kubectl get diagnosticreport` to see if the AI's analysis makes sense. If it looks reliable, change the status to `Approved`. The Operator detects the approval signal and directly applies the Patch to the cluster via `client-node`, completing the automatic fix.

## Why Node.js?

Many people ask, why not use Go for cloud-native?

1.  **Ecosystem Affinity**: AI Agent orchestration (like LangChain.js, GenKit) is very active and easy to use in the Node.js ecosystem.
2.  **Development Efficiency**: For this kind of "glue logic" Controller, JS's JSON handling capabilities and event-driven model are very comfortable to work with.
3.  **Dynamism**: JS's dynamic nature makes handling various unstructured AI outputs and K8s resource objects (which are essentially JSON) much freer of boilerplate code compared to strongly-typed Go.

## Conclusion

`k8s-smart-sre-operator` demonstrates a possibility: future ops automation won't be about hard-coding a bunch of `if pod.status == 'Error'`, but about teaching AI how to troubleshoot like a human.

We are moving from **Automated Ops** to **Agentic Ops**. In this process, the Operator is no longer a script-executing machine, but the neural center connecting the AI brain to the infrastructure limbs.
