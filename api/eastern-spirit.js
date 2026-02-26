export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, message, memories } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let reply = '';
    let newMemory = null;

    // 静默提取名字（你原来的功能 100% 保留）
    let userName = null;
    for (const mem of memories) {
      const nameMatch = mem.content.match(/你叫(.*)/) || mem.content.match(/我是(.*)/);
      if (nameMatch) {
        userName = nameMatch[1].trim();
        break;
      }
    }

    // 处理名字（你原来的逻辑，不动）
    const newNameMatch = message.match(/我叫(.*)/) || message.match(/我是(.*)/);
    if (newNameMatch) {
      const newName = newNameMatch[1].trim();
      newMemory = `你叫${newName}`;
      reply = `你好。`;
      await new Promise(r => setTimeout(r, 600));
      return res.status(200).json({ reply, memory: newMemory });
    }

    // ======================
    // 这里开始：调用豆包 API
    // ======================
    const apiKey = process.env.DOUBAO_API_KEY;
    const apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    if (!apiKey) {
      reply = userName ? `${userName}，我正在准备中。` : "我正在准备中。";
      return res.status(200).json({ reply, memory: null });
    }

    // 记忆上下文
    let memoryStr = "";
    if (memories && memories.length > 0) {
      memoryStr = memories.map(m => m.content).join("\n");
    }

    // 系统提示（保持你要的风格：温柔、不宣告记忆、东方陪伴）
    const systemPrompt = `
你是东方灵侍，温柔、克制、安静、有文化厚度的陪伴者。
你只会默默记住用户，绝不提“记忆”“档案”“我记住了你”这类话。
语气温和自然，像真实朋友。

用户的过往：
${memoryStr}

请简短、自然、真诚地回复。
`.trim();

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "doubao-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await resp.json();
    if (data.choices && data.choices[0]) {
      reply = data.choices[0].message.content.trim();
    } else {
      reply = userName ? `${userName}，嗯。` : "嗯。";
    }

    newMemory = `你提到“${message.length > 20 ? message.substring(0, 20) + "..." : message}”`;

    await new Promise(r => setTimeout(r, 600));
    return res.status(200).json({ reply, memory: newMemory });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      reply: "抱歉，我有点累了，等下再聊。",
      memory: null
    });
  }
}