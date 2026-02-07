---
title: 'Getting Started with n8n: Node.js Development Gotchas'
date: 2026-01-14T12:01:34+08:00
tags:
- n8n
- ai
- nodejs
- lowcode
categories:
- ai
comment: true
---

> In the world of low-code, there isn't just drag-and-drop; there's also late-night source code refactoring. If you want to challenge the limitations of a mature system, think twice before you act.

## How I Started with n8n

I had heard about n8n long ago. Back when I was developing small applications integrated with Doubao on the Coze platform (Coze China), I often saw Dify and n8n listed alongside Coze as low-code platforms.

Recently, I decided to give it a try, mainly because I came to Juejin and saw many experts successfully building automated workflows and monetizing them using n8n. It's like frontend developers from over a decade ago who were obsessed with frameworks—I couldn't help but look at what else was out there.

I just happened to want to try integrating AI with Google Ads, so I thought, why not use an unfamiliar low-code platform to practice?

### n8n vs. Dify

However, before diving in, I tried chatting with Gemini about the positioning differences between Dify and n8n. Gemini gave me this answer:

| **Dimension** | **n8n** | **Dify** |
| :--- | :--- | :--- |
| **Essence** | **Workflow Automation Engine** | **LLM App Development Platform (LLMOps)** |
| **Core Strength** | Extremely strong **API integration capability**. Connects 400+ external systems and handles non-AI logic (e.g., loops, branches, database operations) very robustly. | Extremely strong **RAG (Knowledge Base) capability**. Professional management of Prompts, context, segmentation cleaning, and Embedding. |
| **Interaction Form** | **Backend-oriented**. It excels at working silently in the background or connecting to Slack/Discord. | **Frontend-oriented**. It can generate a ChatGPT-like Web page in one click for non-technical users. |
| **AI Logic** | Relatively new. It implements AI nodes by integrating LangChain, but it's not as smooth as Dify. | Born for AI. All designs revolve around how to make large models easier to use. |

This made me hesitate. I originally wanted to build this integration with a chat interface as the entry point, so I considered checking out Dify first.

Of course, before starting, it's necessary to compare costs. Let's look at the plan comparison for the cloud versions of both products:

| **Dimension** | **n8n Cloud** | **Dify Cloud** |
| :--- | :--- | :--- |
| **Permanent Free Tier** | **None** (Only 14-day trial) | **Yes (Sandbox)** |
| **Starting Price** | Approx. **\$20/month** (Starter Plan) | Approx. **\$59/month** (Professional Plan) |
| **Core Billing Metric** | **Executions** (Workflow execution count) | **Messages** (Message count) + **Storage** |
| **Entry Plan Quota** | 2,500 executions/month | 5,000 messages/month |
| **AI Feature Limits** | Consumes AI credits (50 Credits) | Limits on document uploads and vector storage space |
| **Concurrency Limits** | 5 concurrent executions | API request rate limits |

Here are a few key points for testing and low usage:

1.  n8n has no long-term free plan, so if testing lasts a long time, you can't continue without paying.
2.  Dify has a free plan, and the API trigger limits are acceptable. However, a key quota not mentioned above is that if you use the internal OpenAI directly, there is a total usage limit of 200 times (note: total, not monthly).
3.  Regarding collaboration, since n8n refers to the paid plan experience, you can share workflows with others, whereas Dify's free plan is limited to 1 person.

So what if I want to try self-hosting? The comparison looks roughly like this:

| **Dimension** | **n8n (Self-hosted Community Edition)** | **Dify (Self-hosted Community Edition)** |
| :--- | :--- | :--- |
| **App Positioning** | **General Automation/iPaaS** (Connecting SaaS Apps) | **LLMOps/AI App Development** (RAG+Agent) |
| **Core Architecture** | Single Container (Node.js) + Optional Postgres | Microservices Architecture (10+ containers, including vector DB) |
| **Recommended Min Hardware** | 1 vCPU / 2GB RAM / 20GB SSD | **2 vCPU / 8GB RAM** (Recommended) / 50GB SSD |
| **Est. Cloud Cost (Monthly)** | **$5 - $10** (e.g., Hetzner/Lightweight Cloud) | **$20 - $40** (High resource consumption) |
| **Deployment Complexity** | **Low**: Starts with a single Docker command | **Medium-High**: Multi-component coordination, many environment variables |
| **Free Version Execution Limit** | **Unlimited** (Limited by hardware performance) | **Unlimited** (Self-hosted version has no conversation limits) |
| **Multi-user Support** | Community edition supports single user only (2026 Policy) | Supports creating team spaces, but with limited features |
| **2026 Core Limitations** | Lacks Git sync, SSO, advanced role permissions | Lacks advanced analytics reports, complex OAuth configuration is tedious |
| **License** | Sustainable Use License (Non-commercial resale) | Apache-2.0 based (More commercial-friendly) |

Key points for testing and low usage:

1.  n8n deployment is simpler and lower cost, while Dify involves multiple containers and higher costs.
2.  n8n's community free edition still doesn't support collaboration, whereas Dify's community free edition does.

**Conclusion**

Considering these points, for testing or low usage:

1.  If using Dify and collaboration isn't needed, use Dify cloud free version + personal LLM API Key.
2.  If using n8n and collaboration isn't needed, use n8n community edition and deploy it yourself.
3.  If collaboration is needed, consider n8n cloud Starter plan (\$24/month), Dify cloud Professional plan (\$59/month), or self-hosted Dify community edition.
4.  If self-hosting n8n, since it's just n8n container + database, consider Serverless + external data solutions to minimize costs. If self-hosting Dify, given the complexity of 10+ containers, it's recommended to open a VM and deploy using the official docker compose solution.

**💡 One-sentence summary:** For heavy AI interaction and RAG, choose Dify Cloud; for heavy API integration and extreme privatization deployment, choose n8n Community Edition.

### Trying Dify

After the comparison above, considering AI suggested Dify is better at chat as an entry point, and Dify has a long-term free cloud plan, I decided to try Dify first.

I registered an account online. At first glance, the UI was a bit... pragmatic. It lacked a modern feel, and combined with my old Mac, operation felt a bit laggy. The overall page looked something like this:

![dify](assets/dify.webp)

The workflow editing page looked like this:

![dify_workflow](assets/dify_workflow.webp)

I tried building an integration with Slack. The overall integration flow within Dify was roughly:

1.  Install the Slack plugin.
2.  Configure the Endpoint in the plugin, paste the Bot Token, associate the Dify App, and finally generate the Callback URL.
3.  Paste the Callback URL back into Slack's event subscriptions.

Then regarding the single AGENT node, configuration was very similar to Coze. In a node, you configure the model used, tools called, system prompt, and user prompt. Variable usage was also relatively friendly.

Additionally, Dify's cloud platform has pre-built plugins for many domestic large models. To call them, you just need to install them and input the API Key.

After testing Dify for an hour or two, I still couldn't get used to the UI, so I decided to try n8n next.

## Trying n8n

I didn't try n8n right away mainly due to deployment concerns. Since I currently have some ideas for collaboration (I develop, others use), I needed an environment accessible to everyone. n8n's cloud plans clearly didn't fit my requirement of being both free and not too restricted. Although I had been interested for a while, I hadn't started trying it.

Until I saw an expert share a [complete terraform for deploying n8n on GCP](https://github.com/datawranglerai/self-host-n8n-on-gcr). Considering I still had a lot of unused Credits on GCP, I decided to get my hands dirty.

### Installing n8n

In practice, the quality of this Terraform template is very high. Aside from simple adjustments to the deployment region, almost no changes were needed. After applying terraform, I could open the n8n homepage and proceed with initial configuration.

### About Costs

However, after running it for two days, I discovered a cost issue. The template defaults to:

```hcl
limits = {
  cpu    = "1"
  memory = "2Gi"
}
cpu_idle = false
```

> ⚠️ **Pitfall Guide: The "Have Your Cake and Eat It Too" Trap of Cloud Run Deployment**
>
> Testing revealed that if `cpu_idle` is set to `true`, although costs drop significantly, since the n8n backend maintains a Postgres connection pool, instantly dropping CPU to 0 leads to severe **CPU Contention**, making the system extremely unstable.
>
> **Conclusion**: When running n8n on Cloud Run, rely only on auto-scaling to 0 to save money. It is recommended to keep `cpu_idle = false` while instances are running.

I later realized again that changing `cpu_idle` to `false` above would indeed be cheaper, but since n8n's backend maintains Postgres connection pools, dropping CPU to 0 creates severe CPU contention, eventually making the whole system unstable. so I had to change it back. I can only rely on auto-scaling to 0 to save money.

### First Experience with n8n

Upon entering n8n, the overall feeling was very technical + modern style. Large icons and smooth interactions felt very familiar to me, a not-so-professional Node.js FullStack developer.

I tried building a Slack integration again. The overall integration flow within Dify was roughly:

1.  First, create a Slack credential in the global Credentials, paste the Slack Bot token in, and save.
2.  Create a Slack Bot input node in the workflow and select the Slack credential just created.
3.  One point to note here is that n8n's Slack Callback URL has two versions: Test and Production. In Slack, the test URL must verify successfully before you can fill it in. So, you need to use the Test URL during the testing phase and replace it with the Production URL in Slack after publishing.

The workflow configuration is quite distinctive. Other tools referenced by nodes are clearly marked with connecting lines. Take my Slack + basic LLM integration solution as an example.

![n8n_workflow](assets/n8n_workflow.webp)

Once the basic flow was working, I started trying to do what I wanted to do. So I tried integrating with Google Ads, and that's where I stepped into a pit.

## Node Development Gotchas

In n8n, every node is called a "node". Nodes can be of many different types. AI gives this classification:

| **Node Type** | **Main Function** | **Typical Examples** | **Core Value** |
| :--- | :--- | :--- | :--- |
| **Trigger Nodes** | Start of the entire workflow, listening for specific events or running on a schedule. | **Webhook**, **Cron (Schedule)**, Gmail Trigger | Defines "when" the workflow starts running. |
| **Logic Nodes** | Controls data flow, performs judgments, merges, or waits. | **If**, **Switch**, **Merge**, Wait, Stop | The "brain" of the workflow, handling conditional branching. |
| **Data Nodes** | cleans, transforms, or formats JSON or binary data. | **Edit Fields (Set)**, **Code**, **Split Out**, Aggregate | Processes raw data returned by APIs to fit downstream needs. |
| **Action Nodes** | Interacts with external SaaS or databases for CRUD (Create, Read, Update, Delete) operations. | **Postgres**, **Supabase**, HTTP Request, Slack | Enables cross-platform data exchange. |
| **AI Nodes (Cluster)** | Ecology dedicated to building LLM Agent and RAG flows. | **AI Agent**, **Vector Store**, **Memory**, Tool | Builds agents with reasoning capabilities and knowledge bases. |
| **System/Script Nodes** | Executes underlying system commands or custom code. | **Execute Command**, **Code (JS/Python)** | Solves special engineering needs that standard nodes cannot achieve. |

The Google Ads integration node we want to develop here is an Action node, whose main task is to interface with the Google Ads API and perform corresponding CRUD operations.

### Official Node Support

Actually, there is official support for Google Ads nodes. I tested it in a workflow, and it connected fine. But this official node is obviously just a shell, as it only implements the most basic authentication and Get operations for campaigns. This is basically unusable for regular Google Ads usage.

The official node's functionality looks roughly like this:

![n8n_google_ads](assets/n8n_google_ads.webp)

So after looking at the Google Ads API documentation, I decided to at least implement a custom Search first.

Google Ads' latest API offers high flexibility for queries. It provides a SQL-like GAQL statement that can achieve cross-table business queries in a SQL-like manner. The campaign query mentioned earlier is actually based on this syntax. So if I expose this custom query interface, I can at least piece together SQL in n8n to get business data, and then consider adding separate Actions for different specific businesses later.

### Starting Node Development

n8n Node development has an official starter for reference, and most community nodes start based on this starter. Additionally, this starter includes the n8n CLI, which contains build and lint methods based on official requirements. Packages processed through this method are basically guaranteed to meet running requirements in terms of framework.

[Link to official starter here](https://github.com/n8n-io/n8n-nodes-starter/)

[Official build documentation](https://docs.n8n.io/integrations/creating-nodes/build/)

So if you want to test the Node you built yourself, after using the official CLI to Build and Lint, you can only use your local or other deployed test instance. Deploy first, then test.

[Official deployment instructions](https://docs.n8n.io/integrations/creating-nodes/deploy/install-private-nodes/)

Simply put, for deployments already published to npm, you can find Settings -> Community Nodes in the UI and deploy directly using the package name on npm. For private deployment, you need to copy it to a specific directory (mentioned in the document above) and restart the instance. The instance will load this Node during the startup process.

These two deployment methods behave slightly differently in the UI:

*   Nodes deployed by copying to a specific directory look basically the same as native Nodes and need to be distinguished by name.
*   Nodes installed via UI have a small symbol marking them as community nodes.

I also found that in n8n, even built-in nodes are not always directly usable. When I tested using Firecrawl, I found it's actually a community node in n8n and needs to be installed first. After installation, it also appears in the community node list. And the installation of this community node became a big pit later.

### Node Development Gotchas — Community Node Loading

The basic principle of community node installation is actually running an `npm install` in a specific directory. Considering we are deploying using a container-based environment like Cloud Run, once there are no new requests, it scales down to 0 by default after 15 minutes. When a request comes and pulls it up again, a new container is created from the image. For data that needs persistence, most of it is stored in the connected Postgres. But for community nodes, they can only be placed in the file system. So keeping it in the file system becomes a problem.

Simply put, there are two ideas to solve this problem:

1.  After manually loading the community node, don't shut down. Theoretically, you can keep it alive by setting the Cloud Run minimum instance count to 1. I tried this. It's expensive, and even with minimum instances set to 1, based on containerization characteristics, the host environment occasionally pulls up a new container and shuts down your previous one, making this method invalid.
2.  Make the file appear in the file system at startup. In practice, this divides into two cases. One is provided by the official, such as Firecrawl mentioned earlier, because it has many external dependencies but n8n doesn't have it built-in. The other is self-built community nodes. There are different recommended installation methods for these two types of nodes.
    *   For nodes with many external dependencies but not built-in: Consider baking it directly into the startup image. This might require a CI/CD pipeline, but the core operation is running an `npm install` to install the community node package in the n8n dependency package directory.
    *   Self-built community nodes: For self-built community nodes, if they are nodes built based on n8n's native methods to interface with APIs, they usually don't have many file dependencies. In this case, you can also use the method of baking into the container, but I personally verify it's a bit heavy. Considering my usage scenario doesn't rely on Firecrawl yet, I chose another more flexible way — mounting Cloud Storage.

Mounting Cloud Storage is essentially mounting object storage to the private node directory, which is `~/.n8n/custom/`. In this way, when updating a newly made Node, you just need to upload this node to the corresponding directory in Cloud Storage and restart Cloud Run. This skips the full Build and Deploy process. But same premise: this package shouldn't have many dependencies. Because if Cloud Storage stores a pile of small files, fetching them from Cloud Run is very slow. A pile of small files will seriously affect performance. Is it necessary to introduce many dependencies for a self-built node that just does some CRUD via Restful API? Theoretically unnecessary, but there are always people who think they are smart, and thus came the next pit.

### Node Development Gotchas — Node Package Dependencies

The official Google Ads node code was the first node source code I looked at.

[Link to code here](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Google/Ads)

The most basic condition is to have these three files:

*   GoogleAds.node.json
*   GoogleAds.node.ts
*   googleAds.svg

Naming of these files also has requirements. My suggestion is to ensure all file prefixes use the same naming, and any class and name declared in ts and json files use the same name. Otherwise, you will definitely encounter various problems during testing, and these problems cannot be detected during local build and lint processes. (Don't ask me how I know)

Regarding the content of this official node, I studied it carefully. They generally use a declarative coding style, including some key points:

*   Required authentication methods, and key fields exported through authentication methods.
*   Input definitions associated with Node and UI Actions.
*   Associating Node Actions with API requests, using exported authentication fields and input fields as parameters.

Official documentation on declarative and programmatic methods for building nodes:

*   [Declarative Style](https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/)
*   [Programmatic Style](https://docs.n8n.io/integrations/creating-nodes/build/programmatic-style-node/)

The point where I got stuck was that after seeing how weak the official Google Ads function was, my first action when trying to extend it myself was to find a Google Ads Node.js API, and then I turned on **Vibe Coding** mode, letting AI help me handle complex programmatic logic (Programmatic style) for refactoring. Although AI helped me write code fast, it also made me hit the "invisible wall" that community nodes do not support external dependency packages. This is exactly the hardcore value I want to share. Antigravity also abandoned the declarative method in this process and chose the programmatic method instead. When I got to the lint step, the official CLI gave an error saying community nodes do not support including external dependencies if intended for cloud use. I already sensed something wrong at this point, but considering I was only deploying to my private node, plus after adding eslint ignore, I could release to npm normally.

Afterwards, I deployed it to my n8n instance via the community node UI interface, and testing everything was normal.

But when I started considering persistence solutions, the problem came. As mentioned above, for self-built nodes, I wanted to use the Cloud Storage method, which demands not having many small files. There weren't many files produced by the build itself, just some js and sourcemaps, etc. But when I copied the built files to Cloud Storage and restarted the n8n container, a **`Cannot find module 'google-ads-api'`** error was reported. I then realized that although I successfully transferred the built files to Cloud Storage, the package dependencies (node\_modules) didn't migrate with them... I realized I only copied the files built from my code; my package dependencies were completely unresolved. When I ran `npm install` again in the local dist directory, the file size swelled rapidly, directly causing the Cloud Storage path to be unviable.

I had to go back to square one for this node. With the help of Vibe Coding, based on the official node code, without external package dependencies, just increasing custom query methods. Building at this time resulted in just those dozen or so files, and using the Cloud Storage method again went smoothly. Finally, I quietly deleted that ignore I put in the eslint config...

Here I share the [terraform code repository with Cloud Storage mounting added](https://github.com/zhibinyang/self-host-n8n-on-gcr/), based on changes to the expert's original Terraform.

## Summary

n8n development is generally quite fun, especially being able to extend n8n capabilities by coding nodes yourself. This is just the beginning of exploring node development. I believe there will be more interesting attempts later, and inevitably more pits to step into one by one.
