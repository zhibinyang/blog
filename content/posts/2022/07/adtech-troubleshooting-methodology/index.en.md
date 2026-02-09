---
title: "No More Guesswork: My 5-Year Firefighting Playbook for AdTech Troubleshooting"
date: 2025-07-20T09:15:00+08:00
tags:
- troubleshooting
- adtech
- methodology
- engineering
categories:
- engineering
- career
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> "Can you check why this ad isn't showing up? Is the system down?"
>
> When I first started in AdTech Technical Support, I dreaded this question. Back then, I was like a clumsy fortune teller, staring at a black screen and guessing wildly: "Maybe it's a config error?", "Maybe network jitter?", "Maybe just bad luck?".
>
> Over the past five years, I've handled thousands of tickets, evolving from chaotic panic to surgical precision. I gradually realized that **Troubleshooting is not a talent, but an engineering discipline that can be systematically trained.** It has principles, tools, and patterns.

![cover](assets/cover.jpg)

Today, I want to share this troubleshooting playbook, polished through countless late-night alerts. It applies not only to AdTech but to debugging any complex system.

## 1. What is Troubleshooting? Not "Trying Luck", But "Process of Elimination"

Many people think troubleshooting is aimlessly scrolling through logs, hoping to get lucky and spot an ERROR.

**Dead wrong.**

The essence of troubleshooting is a process of **Logical Search and Elimination**. It's like detective work:
1.  **Identify Symptoms**: Even "it's not working" can mean a million things (Is it a 404? Timeout? Empty response?).
2.  **Elimination**: List all suspects (Network, Config, Code, Database), and rule them out one by one with evidence.
3.  **Final Confirmation**: Troubleshooting isn't over until you can stably reproduce the issue and make it stably disappear by fixing it.

## 2. Five Core Principles: Don't Be Fooled by "Survivorship Bias"

When dealing with complex systems (like an ad system handling billions of requests daily), these five principles are my lifeline:

### 1. Always Know "Normal" Behaviors
This is the prerequisite. If you don't know what a healthy system looks like, how do you know it's sick?
*   *Example*: You must know that traffic naturally dips at 3 AM. If you don't understand this "normal" pattern, you might panic over a "traffic plunge" in the middle of the night for nothing.

### 2. Only Trust What You See
**Never, ever trust someone else's description alone.**
*   *Customer says*: "I passed all test configurations."
*   *Reality*: Not only did they not pass, but they also used the wrong Test ID.
*   *Mantra*: I need logs, screenshots, HAR files. Trust nothing but evidence.

### 3. Everything Has a Reason
Computers don't believe in magic. Systems don't just "suddenly" break; a variable must have changed.
*   *Mantra*: Maintain a paranoid sensitivity to details. That inconspicuous Config Change is often the culprit.

### 4. Insight from Data Patterns
 in massive logs, looking at a single line is useless. You need to look for **Patterns**.
*   *Example*: Is it all iOS users? Or only iOS users in California? By slicing dimensions, you can instantly narrow the scope by 90%.

### 5. Distinguish Causes vs. Behaviors
"High CPU" is a behavior, not a cause. "Infinite loop code" is the cause. Don't mistake painkillers for antibiotics; treating symptoms without curing the disease is a troubleshooting taboo.

## 3. The Arsenal: Proactive, Passive, and Scenario

For different battle situations, we need different weapons:

| Tactic Type | Typical Weapons | Scenario |
| :--- | :--- | :--- |
| **Proactive** | Debug Sessions, Test Preview Pages | No alerts yet, but I feel something is off, so I actively poke the system. |
| **Passive** | Access Logs, Aggregated Monitoring (Datadog/Grafana) | The alarm is ringing. Stay calm, look at the big picture first, then individual cases. |
| **Scenario** | Constructing Requests (cURL), Reproduction Scripts | Since you say there's an issue, I'll simulate an identical request to see if it actually breaks. |

## 4. Real-World Cases: The Pits I've Fallen Into

 To give you a better feel, here are a few anonymized typical cases from recent years. Every pit is a lesson learned in blood and tears.

### Case 1: The Missing 25 Days (System Limits)
*   **Phenomenon**: A Frequency Capping feature suddenly failed for long-cycle settings, like "Show once in 30 days".
*   **Truth**: Our code converted time into seconds. When the cycle exceeded 24.8 days, the seconds exceeded the **Integer** limit, causing an overflow.
*   **Lesson**: Knowing the underlying system limits (Database types, Variable types) is crucial.

### Case 2: The Self-Deceiving Config (Config Error)
*   **Phenomenon**: An operations colleague ran over urgently: "I updated the targeting rules, why isn't it working? It's a Bug!"
*   **Truth**: In that complex backend, there was a tiny checkbox called "Apply to all existing ads". He changed the rule but didn't check the box. The new rule only applied to new ads; old ads continued as before.
*   **Lesson**: 90% of "System Bugs" turn out to be "Configuration Errors".

### Case 3: The Ghost of Timezones (Environment)
*   **Phenomenon**: Finance reconciliation never matched, always off by a few thousand dollars.
*   **Truth**: The upstream system used UTC, we used EST. The data during those few hours of day-crossing was always a mess.
*   **Lesson**: In cross-border business, **Timezone** is always the number one suspect.

## Conclusion

The path to advanced technical support is an evolution from "wild guessing" to "logical reasoning."

Next time you face a tricky problem, try to take a deep breath and ask yourself three questions:
1.  **What should the normal behavior be?**
2.  **What evidence do I see right now?**
3.  **What variable caused the difference between the two?**

When you start thinking like this, you are no longer a fortune teller, but a true engineer.
