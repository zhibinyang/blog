---
title: "2025 Job Hunting Survival Guide: How I Used AI to Turn My Resume into a 'Solution Selling Proposal'"
date: 2025-07-05T10:00:00+08:00
tags:
- langchain
- cloudflare
- ai
- career
categories:
- ai
- career
comment: true
featuredImagePreview: assets/cover-preview.jpg
---

> The summer of 2025 is even hotter than the job market.
>
> As a veteran in the tech industry, I realized that the traditional "apply everywhere" strategy has completely failed. HR inboxes are stuffed with identical PDFs, and job descriptions (JDs) are increasingly looking for a "mythical unicorn."
>
> Just as I was staring at my screen, preparing to edit my Word document for the 100th time, it hit me: **Isn't job hunting essentially a B2B sale?**
>
> Since I am the "product," the company is the "client," and the JD is the "Request for Proposal (RFP)," why can't I use the **Solution Selling** mindset to restructure my resume? So, I spent a weekend building an intelligent assistant to automate this process for me.

![cover](assets/cover.jpg)

## The Essence of a Resume: Not a User Manual, But a Proposal

Many resumes read like **product manuals**:
*   "I mastered Java"
*   "I am familiar with React"
*   "I have done both backend and frontend"

But what the interviewer (the client) really cares about is: **"How can these skills help me solve my problems?"**

If you are interviewing for an e-commerce company facing "high concurrency traffic," your resume should talk extensively about how you optimized Redis caching; if you are interviewing for a startup team, you should emphasize your full-stack delivery capability and low-cost architecture solutions.

**The same "me," facing different "clients," should have completely different "selling points."**

Manually editing resumes is exhausting and easy to miss key information. That's why I developed **Smart Resume**—to let AI help me complete the entire process from "requirements analysis" to "customized proposal."

## Core Workflow: Thinking Like a Top Salesperson

I deployed this system on **Cloudflare Workers**, combined with **D1 Database** and **LangChain**. It acts like a tireless sales assistant.

### Step 1: Know Your Customer (KYC)

When I feed it a JD link, it doesn't start writing immediately. It first uses the **Baidu Search API** to "background check" the company:
*   What is the recent news about this company?
*   Who are its competitors?
*   What challenges is the department for this position facing?

*AI's Inner Monologue:*
> "This company just secured Series B funding and aims to double its user base within 3 months. The JD repeatedly mentions 'growth hacker' and 'data-driven.' It seems their biggest anxiety right now is CAC (Customer Acquisition Cost) and retention rate."

### Step 2: Inventory Check

All my past experiences (education, projects, skills) are stored structurally in the **Cloudflare D1** database. This is thanks to the **JSON Resume** standard, which turns the resume into programmable data rather than rigid layout.

Smart Resume will "prescribe medicine" from my database based on the "customer background check" just performed.

If the target is the company mentioned above, it will automatically hide my "technically impressive but irrelevant" low-level architecture experience, and highlight the project where I "improved conversion rate by 20% through A/B testing" at my previous company, placing it in the most prominent position.

### Step 3: Generate Proposal

Finally, it's not just simple assembly, but **rewriting**.

I used **Doubao AI (via LangChain)** for the final polish. It rewrites my project description from:
> "Responsible for developing the marketing system using Vue3 and Spring Boot."

To:
> "Led the construction of a high-availability marketing system, supporting 10x traffic growth during Double 11. Refactored components with Vue3, improving page load speed by 30% and directly contributing to user retention."

See, this is the difference between **Feature** and **Benefit**.

## Tech Implementation: Lightweight & Standard

What makes me proudest of this project is not complex algorithms, but its lightweight nature.

*   **Cloudflare Workers**: Zero-cost operation, global acceleration.
*   **JSON Resume**: An underrated open-source standard. It achieves "separation of content and style." AI only needs to generate JSON data, and rendering is handled by a dedicated Theme (I used a localized StackOverflow theme).
*   **LangChain**: Used to orchestrate search, database queries, and LLM generation logic.

## Conclusion

(Inner Monologue) When I took this AI-customized resume to the interview, the interviewer's first sentence was usually: "You know our company very well, and not just technology, but also the business."

At that moment, I knew I had it.

Technology can be used not only to write code but also to market ourselves. In the AI era, **don't be a 'part' waiting to be picked, be a 'solution' providing value.**

{{< github-link link="https://github.com/zhibinyang/smart-resume" text="View on GitHub" >}}
