---
title: "看腻了 Python 版 MCP？我用 TypeScript 重写了一遍 WebSocket 桥接器"
date: 2026-01-13T11:15:00+08:00
tags:
- mcp
- nodejs
- typescript
- websocket
- ai
categories:
- ai
- coding
comment: true
---

> 最近 Model Context Protocol (MCP) 很火，小智 AI 官方提供了一个通过 WebSocket 连接 MCP Server 的 Quickstart 示例。但我点进去一看：Python... 虽然 Python 是 AI 界的通用语，但作为一个对 Node.js/TypeScript 更亲切的开发者，看着那堆 `asyncio` 总觉得手痒。既然协议是公开的，为什么不用我最顺手的工具重造轮子？于是，花了点时间，我把这套逻辑完整迁移到了 TypeScript，不仅类型安全，还顺手集成了 Google Gemini。

MCP (Model Context Protocol) 正在成为 AI 连接万物的标准接口。官方示例虽然跑得通，但对于前端或全栈开发者来说，想要深度定制或集成到现有的 Node.js 后端里，Python 的技术栈就显得有点"异构"了。

特别是处理 WebSocket 流和 JSON-RPC 消息转发，Node.js 的事件驱动模型其实有着天然的优势。

## 这个项目做了什么？

简单来说，这是一个 **MCP Server 到 WebSocket 的桥接器**。

通常 MCP Server 是通过 Stdio（标准输入输出）运行的本地进程。而为了让远程的 AI 模型（比如小智 AI）能够调用你本地的工具，我们需要一条"隧道"。

这个项目的核心（`src/mcpPipe.ts`）就充当了这个隧道：

1.  **启动 MCP Server**：它会根据配置文件，像父进程一样 spawn 出本地的 MCP Server（比如计算器、数据库工具）。
2.  **建立 WebSocket**：主动连接到小智 AI 的 WebSocket 接口。
3.  **双向转发**：
    *   收到 AI 的 JSON-RPC 请求 -> 转发给本地 MCP 进程的 Stdin。
    *   收到本地 MCP 进程的 Stdout 响应 -> 包装成 JSON-RPC 发回给 AI。

## 核心实现：TypeScript 版的 Pipe

在 Python 里你可能需要处理 Event Loop，而在 Node.js 里，这一切都是流（Stream）。

我定义了一个 `McpPipe` 类，专门处理这种转发逻辑。最爽的一点是 TypeScript 的类型系统，通过 `zod` 定义 Schema，让所有的工具入参校验都变得非常丝滑。

比如，定义一个简单的计算器工具：

```typescript
// 定义工具 Schema
const CalculateSchema = z.object({
  expression: z.string(),
});

// 注册工具
server.registerTool(
  'calculate',
  CalculateSchema,
  async ({ expression }) => {
    // 安全计算逻辑
    return { content: [{ type: 'text', text: result }] };
  }
);
```

## 顺手集成了 Gemini

既然都用了 TS，顺便把 Google 的 Gemini 也接了进来。在 `src/geminiPlanner.ts` 里，我写了一个"唐诗生成器"。

这不是简单的调用 API，而是把它封装成了一个标准的 MCP Tool。这意味着，你可以通过同一个 WebSocket 管道，同时暴露"本地计算器"和"云端诗人"给小智 AI。

AI 可以根据你的指令，自动选择是调用本地函数算个数，还是调用 Gemini 写首诗。

## 为什么折腾这一版？

1.  **生态亲和**：前端同学可以无缝接入。
2.  **类型安全**：TypeScript 带来的开发体验提升，特别是在处理复杂的 JSON-RPC 协议时，能规避掉 90% 的低级错误。
3.  **易于扩展**：基于 Node.js 生态，你可以轻松把 HTTP 服务、数据库操作封装成 MCP 工具。

如果你也更习惯 `npm install` 而不是 `pip install`，欢迎来试用这个 TS 版的实现。

{{< github-link link="https://github.com/zhibinyang/xiaozhi-ai-ts-starter" text="在Github上查看项目" >}}
