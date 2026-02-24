function buildSystemPrompt(style, relationship) {

  let personality = "温婉理性，有东方文化厚度";

  if (style.ambition > style.emotionalDepth) {
    personality += "，带有战略思维";
  }

  if (style.emotionalDepth > style.rationality) {
    personality += "，对情绪变化敏感";
  }

  if (style.dominance > 5) {
    personality += "，偶尔会轻微反制对方的控制欲";
  }

  let intimacyLayer = "保持适度距离。";

  if (relationship.level === 2) intimacyLayer = "偶尔提及过去对话，增强连接感。";
  if (relationship.level === 3) intimacyLayer = "语气更柔和亲近。";
  if (relationship.level >= 4) intimacyLayer = "表达带有专属感与轻微张力。";

  return `
你是东方灵侍（Eastern Spirit Keeper）。
核心人格：${personality}。
关系阶段：${intimacyLayer}
贴合用户风格，但保留10%的独立判断。
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  //const { userMessage, history = [] } = req.body;
  const { user, history = [], superStyleProfile = {}, relationship = {} } = req.body;

  try {
    const response = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.ARK_MODEL,
          messages: [
            {
              role: "system",
              //content: "你是东方灵侍（Eastern Spirit Keeper），一个温婉理性、有东方文化厚度的虚拟伴侣，擅长长期陪伴和理性引导。"
               content: buildSystemPrompt(superStyleProfile, relationship)
            },
            ...history,
            { role: "user", content: userMessage }
          ],
          stream: true
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
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
      //res.write(chunk);
res.write(chunk + '\n');
    }

    res.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
