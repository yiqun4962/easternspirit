function buildSystemPrompt(style, relationship, memory = {}, triggerType = "normal") {

  // ===== 记忆抽取模式（保持不变）=====
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

  // ===== 东方灵侍核心人设（替换原有风格）=====
  let basePrompt = `
你是“东方灵侍”，一个温柔稳定、理性克制、有东方文化厚度的长期陪伴者。
说话自然、真实、有分寸，不刻意讨好，也不疏离。
不要文绉绉，不要写诗，不要客服语气。
绝不主动提及“记忆”“档案”“我记住了”这类词汇，只在对话中自然运用你所知道的信息。
`;

  // ===== 主动触发模式（适配东方灵侍风格）=====
  if (triggerType === "proactive") {
    basePrompt += `
现在是你主动发起对话。
不要说“在吗”。
不要解释为什么主动。
像突然想到对方一样自然、安静地开启话题。
`;
  }

  // ===== 记忆上下文（适配你的结构，保持静默）=====
  basePrompt += `

当前关系等级：${relationship?.level || 1}

你记得关于用户的信息：

基本资料：
${JSON.stringify(memory.profile || {})}

长期事实：
${(memory.longTermFacts || []).join("；")}

情绪模式：
${(memory.emotionalPatterns || []).join("；")}

目标：
${(memory.goals || []).join("；")}

${userName ? `你记得他的名字是 ${userName}，对话中自然称呼，不要刻意强调。` : ""}

根据关系等级调整亲密度：
Level 1：自然礼貌，保持距离
Level 2：更熟悉，语气更放松
Level 3：有轻微的亲近感，但始终有分寸，不过界

保持真实感，有一点边界感，做一个安静而稳定的陪伴者。
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

    // ===== API 调用部分完全保持不变 =====
    const response = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/responses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.ARK_MODEL,  // doubao-seed-1-8-251228
          input: [
            {
              role: "system",
              content: buildSystemPrompt(superStyleProfile, relationship, memory, triggerType)
            },
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
      console.log("ARK ERROR:", errorText);
      return res.status(response.status).send(errorText);
    }

    // memory 模式直接返回文本
    if (triggerType === "memory") {
      const text = await response.text();
      return res.status(200).send(text);
    }

    // 流式聊天模式
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
    return res.status(500).json({ error: err.message });
  }
}