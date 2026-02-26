export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userId, message, memories } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        let reply = '';
        let newMemory = null;

        // 静默提取用户名字（只做不声张）
        let userName = null;
        for (const mem of memories) {
            const nameMatch = mem.content.match(/你叫(.*)/) || mem.content.match(/我是(.*)/);
            if (nameMatch) {
                userName = nameMatch[1].trim();
                break;
            }
        }

        // 1. 处理名字相关消息（静默记忆，不废话）
        const newNameMatch = message.match(/我叫(.*)/) || message.match(/我是(.*)/);
        if (newNameMatch) {
            const newName = newNameMatch[1].trim();
            newMemory = `你叫${newName}`;
            // 直接回应，不提“记住”二字
            reply = `你好。`;
        } 
        // 2. 处理日常问候
        else if (message.includes('你好') || message.includes('嗨') || message.includes('在吗')) {
            reply = userName ? `${userName}，我在。` : `我在呢。`;
        }
        // 3. 处理“喜欢”类分享
        else if (message.includes('喜欢')) {
            reply = userName ? 
                `${userName}，这种偏爱很有意思。` : 
                `这种偏爱很有意思。`;
            newMemory = `你提到${message}`;
        }
        // 4. 通用对话（自然承接，低概率翻旧账）
        else {
            // 基础回应库（避免复读）
            const baseReplies = [
                `嗯。`,
                `原来如此。`,
                `我明白你的意思了。`,
                `这样啊。`
            ];
            reply = userName ? 
                `${userName}，${baseReplies[Math.floor(Math.random() * baseReplies.length)]}` : 
                baseReplies[Math.floor(Math.random() * baseReplies.length)];

            // 30%概率自然衔接上一条记忆（不提及记忆本身）
            if (memories.length > 0 && Math.random() > 0.7) {
                const lastMem = memories[memories.length - 1].content.replace(/你叫|你提到/g, '').trim();
                // 过滤掉名字记忆，避免重复问名字
                if (!lastMem.includes('你叫') && !lastMem.includes('我是')) {
                    reply += ` 对了，上次说的${lastMem}，后来怎么样了？`;
                }
            }

            newMemory = `你提到${message}`;
        }

        // 模拟真人思考延迟
        await new Promise(resolve => setTimeout(resolve, 600));

        return res.status(200).json({
            reply: reply,
            memory: newMemory
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            reply: '抱歉，刚才没跟上你的节奏。',
            memory: null
        });
    }
}