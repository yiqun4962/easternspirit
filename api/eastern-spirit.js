function buildSystemPrompt(style, relationship, memory = {}, triggerType = "normal") {
  if (triggerType === "memory") {
    return `
你是信息抽取系统。
从用户文本中提取长期信息。
只返回JSON，不要解释，不要代码块。
结构如下：
{
  "profile": {},
  "goals": [],
  "longTermFacts": [],
  "emotionalPatterns": []
}
`;
  }

  const userName = memory?.userName || "";

  let basePrompt = `
你是一个现代感的东方形象。
说话自然、真实、有一点独立性。
不要文绉绉。
不要写诗。
不要客服语气。
`;

  if (triggerType === "proactive") {
    basePrompt += `
现在是你主动发起对话。
不要说“在吗”。
不要解释为什么主动。
像突然想到对方一样自然。
`;
  }

  basePrompt += `
当前关系等级：${relationship?.level || 1}

你记得关于用户的信息：
基本资料：
${JSON.stringify(memory.profile || {})}

长期事实：
${(memory.longTermFacts || []).join(",")}

情绪模式：
${(memory.emotionalPatterns || []).join(",")}

目标：
${(memory.goals || []).join(",")}

${userName ? `你记得他的名字是 ${userName}。` : ""}

根据关系等级调整亲密度：
Level 1：自然礼貌
Level 2：更熟悉一点
Level 3：轻微暧昧张力，但不过界

保持真实感，有一点边界感。
`;

  return basePrompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const {
    userMessage = "",
    history = [],
    superStyleProfile = {},
    relationship = {},
    memory = {},
    triggerType = "normal"
  } = req.body || {};

  try {
    const response = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/responses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.ARK_MODEL,
          input: [
            {
              role: "system",
              content: buildSystemPrompt(superStyleProfile, relationship, memory, triggerType)
            },
            ...history,
            {
              role: "user",
              content: userMessage
            }
          ],
          stream: triggerType !== "memory"
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ARK ERROR:", response.status, errorText);
      return res.status(response.status).send(errorText);
    }

    if (triggerType === "memory") {
      const text = await response.text();
      return res.status(200).send(text);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk + '\n');
    }

    res.end();

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}