---
title: "Tired of the Python MCP? I Rewrote the WebSocket Bridge in TypeScript"
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

> The Model Context Protocol (MCP) has been gaining traction recently. Xiaozhi AI released a Quickstart example for connecting an MCP Server via WebSocket. But when I checked it out, it was in Python. While Python is the lingua franca of AI, as a developer who feels more at home with Node.js and TypeScript, staring at `asyncio` code sparked a desire to rewrite it. Since the protocol is open, why not build it with the tools I love? I spent some time migrating the entire logic to TypeScript, adding type safety and integrating Google Gemini along the way.

MCP (Model Context Protocol) is becoming the standard interface for AI connectivity. While the official example works, the Python stack can feel alien to frontend or full-stack developers looking to customize it or integrate it into an existing Node.js backend.

Node.js's event-driven model actually has a natural advantage when handling WebSocket streams and JSON-RPC message forwarding.

## What does this project do?

Simply put, it's a **bridge between an MCP Server and WebSocket**.

Typically, an MCP Server runs as a local process via Stdio. To allow a remote AI model (like Xiaozhi AI) to call your local tools, we need a "tunnel".

The core of this project (`src/mcpPipe.ts`) acts as this tunnel:

1.  **Start MCP Server**: It spawns the local MCP Server (such as a calculator or database tool) based on your configuration.
2.  **Establish WebSocket**: It actively connects to Xiaozhi AI's WebSocket interface.
3.  **Bidirectional Forwarding**:
    *   Receives JSON-RPC requests from AI -> Forwards to the local MCP process's Stdin.
    *   Receives Stdout responses from the local MCP process -> Wraps them as JSON-RPC and sends them back to the AI.

## Core Implementation: The TypeScript Pipe

In Python, you manage the Event Loop; in Node.js, everything is a Stream.

I defined an `McpPipe` class to handle this forwarding logic. The highlight is TypeScript's type system—defining Schemas with `zod` makes tool input validation incredibly smooth.

For example, defining a simple calculator tool:

```typescript
// Define tool Schema
const CalculateSchema = z.object({
  expression: z.string(),
});

// Register tool
server.registerTool(
  'calculate',
  CalculateSchema,
  async ({ expression }) => {
    // Safe calculation logic
    return { content: [{ type: 'text', text: result }] };
  }
);
```

## Integrated Gemini

Since I was already using TypeScript, I integrated Google's Gemini as well. In `src/geminiPlanner.ts`, I built a "Tang Poetry Generator".

This isn't just an API call—it's encapsulated as a standard MCP Tool. This means you can expose both a "local calculator" and a "cloud poet" to Xiaozhi AI through the same WebSocket pipe. The AI can automatically choose to call a local function for calculations or Gemini to write a poem based on your instructions.

## Why rewrite it?

1.  **Ecosystem Fit**: Frontend developers can jump right in.
2.  **Type Safety**: TypeScript improves the development experience, helping to avoid common errors when dealing with complex JSON-RPC protocols.
3.  **Extensibility**: Leveraging the Node.js ecosystem, you can easily wrap HTTP services or database operations as MCP tools.

If you also prefer `npm install` over `pip install`, give this TypeScript implementation a try.

{{< github-link link="https://github.com/zhibinyang/xiaozhi-ai-ts-starter" text="View on GitHub" >}}
