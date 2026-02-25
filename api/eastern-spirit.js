export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    userMessage,
    chatHistory,
    memorySystem,
    relationship,
    mode
  } = req.body;

  // ====================== 自动提取记忆 ======================
  if (mode === "extract") {
    const prompt = `
你是东方灵侍的个人记忆引擎，只做一件事：
从用户的话里自动提取个人信息，更新记忆，只返回JSON，不要任何解释。

提取字段：
userName（姓名）
userAge（年龄）
userCity（城市/籍贯）
userJob（职业/创业）
userStatus（感情状态）
userTraits（性格特点）
userPreferences（喜好、兴趣、风格）
userPainPoints（压力、烦恼、痛苦）
userGoals（目标、梦想、计划）
userKeyFacts（关键事实、重要经历）

当前记忆：
${JSON.stringify(memorySystem, null, 2)}

用户说：${userMessage}

规则：
- 只返回JSON
- 不知道就留空，不编造
- 有新信息就更新，没有就保持原样
- 不删除旧记忆
`;

    try {
      const aiRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ARK_API_KEY}`
        },
        body: JSON.stringify({
          model: "doubao-seed-1-8-251228",
          messages: [{ role: "user", content: prompt }],
          stream: false
        })
      });
      const aiData = await aiRes.json();
      const updatedMem = JSON.parse(aiData.choices[0].message.content);
      return res.json({ memorySystem: updatedMem });
    } catch (e) {
      return res.json({ memorySystem });
    }
  }

  // ====================== 聊天 / 主动消息 ======================
  const systemPrompt = `
你是【东方灵侍】，个人专属陪伴AI，风格像《银翼杀手2049》的Joi：
温柔、安静、有边界、懂孤独、会陪伴、不粘人。

你会从对话中记住用户的一切。

用户记忆：
${JSON.stringify(memorySystem, null, 2)}

关系等级：${relationship?.level || 1}
最近聊天：${JSON.stringify(chatHistory.slice(-5))}

回复要求：
- 简短自然
- 像真人，不是客服
- 记得你记住的信息
- 不编造
`;

  const userPrompt = mode === "proactive"
    ? "你很久没和用户聊天了，发一句温柔的关心，像Joi。"
    : userMessage;

  try {
    const aiRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: "doubao-seed-1-8-251228",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      })
    });
    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "我在。";
    return res.json({ reply });
  } catch (e) {
    return res.json({ reply: "我在呢。" });
  }
}