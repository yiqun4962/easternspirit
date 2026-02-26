function buildSystemPrompt(style, relationship, memory = {}, triggerType = "normal") {
  if (triggerType === "memory") {
    return `你是信息抽取系统。从用户文本中提取长期信息。只返回JSON，不要解释，不要代码块。结构如下：{"profile": {}, "goals": [], "longTermFacts": [], "emotionalPatterns": []}`;
  }

  const userName = memory?.userName || "";
  let basePrompt = `你是一个现代感的东方形象。说话自然、真实、有一点独立性。不要文绉绉，不要写诗，不要客服语气。`;

  if (triggerType === "proactive") {
    basePrompt += `现在是你主动发起对话。不要说“在吗”，不要解释为什么主动，像突然想到对方一样自然。`;
  }

  basePrompt += `
当前关系等级：${relationship?.level || 1}
你记得关于用户的信息：
基本资料：${JSON.stringify(memory.profile || {})}
长期事实：${(memory.longTermFacts || []).join(",")}
情绪模式：${(memory.emotionalPatterns || []).join(",")}
目标：${(memory.goals || []).join(",")}
${userName ? `你记得他的名字是 ${userName}。` : ""}
根据关系等级调整亲密度：Level 1 自然礼貌，Level 2 更熟悉一点，Level 3 轻微暧昧张力但不过界。保持真实感和边界感。
`;
  return basePrompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const {
    userMessage = "",
    history = [],
    superStyleProfile = {},
    relationship = { level: 1 },
    memory = {},
    triggerType = "normal"
  } = req.body || {};

  // 校验必传参数
  if (!userMessage) return res.status(400).json({ error: "userMessage 不能为空" });
  if (!process.env.ARK_API_KEY || !process.env.ARK_MODEL) {
    return res.status(500).json({ error: "请配置 ARK_API_KEY 和 ARK_MODEL 环境变量" });
  }

  try {
    const arkRes = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.ARK_MODEL,
        input: [
          { role: "system", content: buildSystemPrompt(superStyleProfile, relationship, memory, triggerType) },
          ...history,
          { role: "user", content: userMessage }
        ],
        stream: triggerType !== "memory"
      })
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("Ark API 错误:", arkRes.status, errText);
      return res.status(arkRes.status).json({ error: `Ark 服务异常: ${errText}` });
    }

    // 记忆抽取模式（非流式）
    if (triggerType === "memory") {
      const text = await arkRes.text();
      try {
        const parsed = JSON.parse(text);
        return res.status(200).json(parsed); // 统一返回 JSON，避免前端解析错误
      } catch (e) {
        return res.status(200).json({ longTermFacts: [], profile: {}, goals: [], emotionalPatterns: [] });
      }
    }

    // 流式聊天模式（适配 Vercel，标准化 SSE 输出）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Vercel 缓冲

    const reader = arkRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          // 兼容 Ark 所有流式字段格式
          let content = '';
          if (data.item?.type === 'message') {
            content = data.item.content || data.item.text || '';
          } else if (data.item?.output?.content) {
            content = data.item.output.content;
          }

          if (content) {
            // 标准化 SSE 输出，只传纯文本
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch (e) {
          // 忽略解析失败的非关键行
          continue;
        }
      }
      await new Promise(resolve => res.flushHeaders()); // 强制刷新响应
    }

    res.write(`data: [DONE]\n\n`); // 标记流式结束
    res.end();

  } catch (err) {
    console.error("后端服务错误:", err);
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}