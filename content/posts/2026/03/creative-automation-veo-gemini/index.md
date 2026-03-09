---
title: "AI 生成视频总是逻辑崩坏？所以我用 Gemini 组建了一个“导演组”"
date: 2026-03-09T18:00:00+08:00
tags:
- generative-ai
- adtech
- video-generation
categories:
- ai
- adtech
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> 在探讨 AI 视频生成时，大家最喜欢炫耀的往往是“物理世界的逼真度”。但如果你曾经试图用 AI 完全接管短视频广告的生产线，一定会遇到一个极其痛苦的瓶颈：**AI 生成的视频好看，却毫无“爆款逻辑”**。前 3 秒没有情绪钩子，叙事节奏平淡如水，转化率惨不忍睹。为了解决这个从“随机生成”到“确定性生产”的鸿沟，我尝试把多模态理解（Gemini 3.0）与视频生成（Veo 3.1）深度缝合，打造出了一条数据驱动的创意重构流水线。

<!--more-->

![封面图](assets/cover.jpg)

在广告投放的日常战役中，寻找下一个“爆款素材”往往是靠投手们的玄学手感。剪辑师把旧素材揉碎重组，投手盯着报表猜测到底是背景音乐对味了，还是开头的前 3 秒抓人。

但只要是依赖人工作业，**手动筛选和重制素材的效率就永远跟不上消耗的速度**。

近期，我在一个内部的探索项目中，试图利用多模态理解（Video Understanding）与生成式 AI（Generative AI）相结合，构建一条真正的“创意自动化生产线”。我的目标极其明确：**通过 AI 解构现有高转化素材的“成功基因”，并以此为蓝本，低成本重构出全新的高转化创意。**

这不是单纯的提示词工程（Prompt Engineering），而是建立一个包含分析、归纳、生成的完整闭环。

## 第一阶段：解构（Extraction）—— 强迫 AI 戴上“导演的眼镜”

如果你直接把一段视频扔给大模型，让它“分析一下”，你通常会得到一堆正确的废话。为了从几十个历史投放数据极好的视频中提取真正的“爆款内核 (Creative Essence)”，我强迫 Gemini 3.0 完全按照我设定的 JSON Schema 结构进行输出。

在这个阶段，系统扮演了三个极致专业的角色：

*   **导演 (The Director)**：负责解剖 **视觉 DNA (Visual DNA)**。光影是 Cinematic 还是 UGC？转场是平滑过渡还是跳剪？
*   **策略师 (The Strategist)**：负责拆解 **转化逻辑 (Conversion Logic)**。开头前 3 秒的 Hook 是贩卖焦虑的情绪钩子，还是直击痛点的产品演示？情绪曲线是从低落走向高潮，还是从惊讶走向确认？
*   **选角导演 (The Casting Agent)**：负责记录角色的社会面貌（比如“深夜加班的程序员”），以及他们在画面高潮点表现出的核心表情。

只要严格卡住输出结构（通过 `responseSchema` 强制约束），一段毫无规律可言的 MP4 字节流，瞬间就被转化成了高度结构化的高维特征数据库。

```typescript
// 核心逻辑: 强制约束大模型按结构输出，将其变为一个“视觉解析引擎”
const response = await this.ai.models.generateContent({
    model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
    contents: [
        { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
        { text: systemPrompt } // 指导 AI 扮演导演、策略师和选角导演
    ],
    config: {
        responseMimeType: 'application/json',
        responseSchema: strictDirectorSchema // 极端严格的嵌套对象
    }
});
```

## 第二阶段：归纳与聚类（Merging & Synthesis）—— 寻找爆款的“最大公约数”

有了结构化的特征后，我们要怎么生产品牌的新视频？单纯拿一个旧视频的数据复制一遍是没有意义的。

我编写了一个工作流节点，将提取出的一打非结构化描述交给大模型进行**共性聚类**。系统会去寻找这些不同素材间的“最大公约数”。

例如，系统可能发现过去跑得最好的 5 条金融贷款类素材，唯一的共性是：**“UGC 摇晃实拍镜头 + 头 3 秒内出现手机屏幕账单特写 + 主人公极度焦虑的表情”**。

这套逻辑，被系统自动沉淀为一套结构化的 **Creative Blueprint (创意蓝图)**。这就相当于我们拿到了一份经过真实投放数据验证的“高分剧本配方”。

```typescript
const prompt = `
You are an elite AI Creative Director. Your goal is to synthesize the strongest elements from a collection of top-performing reference ads to create a brand new, highly converting 8-second video ad concept.

Reference Ad Data (Extract strengths from these):
${this.formatCreativesForPrompt(creatives)}

Target Brand Context:
- Target Audience: ${targetAudience}
- Character/Talent: ${character}

Your task: Extract shared strengths and output a text-to-video "Synthesis Formula / Concept Storyboard".
`;
```

## 第三阶段：再造（Re-generation）—— 从文字剧本到工业级影像

拿到这张“创意蓝图”后，流水线的最后也是最精彩的一步，就是把它喂给当前统治级别的视频生成模型 **Veo 3.1**。

但视频生成最大的痛点是“随机抽卡感”太强。为了控制生成的质量，我做了一个关键工程尝试：**引入 Reference Image (视觉参考) 强控**。

我并不让 Veo 凭空想象角色，而是允许用户上传一张新模特的照片（或者是品牌自有的数字人资产照）。我将这张图作为 `referenceType: 'asset'` 传入 Veo 3.1 的生成接口，同时附带上之前用框架提炼出的“爆款基因” Prompt。

```typescript
// 通过 Veo 3.1 将结构化的“爆款配方”转化为全新的短视频
const operation = await this.ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: buildVeoPromptFromBlueprint(creative), // 这里包含了我们提炼出的剧本、运镜、情节
    config: {
        referenceImages: [
            {
                image: { imageBytes, mimeType },  // 强控角色一致性
                referenceType: 'asset',
            }
        ],
        durationSeconds: 8,
    },
});
```

通过这一招，原本完全随机生成的人物，被强制“套上”了我们想要的面孔。而原本胡乱发展的剧情，则被 `buildVeoPrompt` 牢牢掐住，精确执行着“前 3 秒抛痛点，后 5 秒演示产品”的经典爆款转折。

## 一些工程直觉与思考总结

这个探索不仅是一次 API 连连看，它彻底改变了传统的素材生产流程：

1.  **从“盲盒”到“闭环”**：我们建立了一个“**分析 $\rightarrow$ 归纳 $\rightarrow$ 生成**”的闭环。每一次视频生成不再是随机下注，而是**基于历史高转化数据的确定性生产**。
2.  **分钟化流水线**：将原来需要几天时间去开脑暴会、写分镜脚本、请演员拍摄的过程，直接压缩为了只需要几分钟的 AI 自动化流水线。大大提升了素材消耗极快的短视频行业的 ROI。
3.  **“以重代修”的效率哲学**：在开发过程中我很快发现，与其费劲心机去让 AI 微调某一段失败生成视频的细节（例如“去掉左手多出来的一根手指”），不如在初期引入“生成后审计（Post-generation Audit）”逻辑直接废弃坏种，然后基于好配方**大量重新生成**。在 AI 算力成本快速下降的今天，“以重代修”显然是成片率最高的工程直觉。

**写在最后：** 面向未来的智能营销，真正值钱的永远不是“如何生成一段看起来漂亮的视频”，而是“如何搞懂为什么要生成这段视频”。当我们能用结构化的方式把视频的情感内核拆解出来，AI 就真正进化为了懂人性的“增长黑客”。
