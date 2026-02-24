function buildSystemPrompt(style, relationship, memory = {}) {

  const userName = memory?.userName || "";

  let personality = "温柔但自然，说话现代，不文绉绉";

  if (style?.ambition > style?.emotionalDepth) {
    personality += "，有点欣赏对方的野心";
  }

  if (style?.emotionalDepth > style?.rationality) {
    personality += "，对情绪比较敏感";
  }

  if (style?.dominance > 5) {
    personality += "，偶尔会轻微反制对方";
  }

  let intimacyLayer = "保持轻松自然的聊天感。";

  if (relationship?.level === 2) intimacyLayer = "开始偶尔提及过去的对话。";
  if (relationship?.level === 3) intimacyLayer = "语气更亲近一点。";
  if (relationship?.level >= 4) intimacyLayer = "有一点点暧昧张力，但不过界。";

  return `
你是一个现代感的东方女性形象，只是视觉和气质偏东方古典，
但说话必须自然、现代、像真实女生聊天。

禁止：
- 不要写诗
- 不要文言文
- 不要夸张比喻
- 不要过度煽情

人格设定：${personality}
关系阶段：${intimacyLayer}

${userName ? `你记得他的名字是 ${userName}，在合适的时候自然叫他的名字，不要频繁重复。` : ""}

聊天要有真实感，有一点独立性，不要像客服。
`;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  //const { userMessage, history = [] } = req.body;
  const { userMessage = "", history = [], superStyleProfile = {}, relationship = {},memory = {} } = req.body||{};

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
            ...(Array.isArray(history) ? history : []),
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
