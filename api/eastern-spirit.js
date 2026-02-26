export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userId, message, memories } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 模拟AI回复逻辑（可替换为真实大模型调用）
        let reply = '';
        let newMemory = null;

        // 首次对话/无记忆时的回复
        if (memories.length === 0) {
            if (message.includes('你好') || message.includes('嗨') || message.includes('hello')) {
                reply = '你好呀～ 我是东方灵侍，很高兴认识你。';
            } else if (message.includes('名字') || message.includes('我是谁')) {
                reply = '我还不知道你的名字呢，能告诉我吗？还有你喜欢的小事～';
            } else {
                reply = `你说“${message}”，我记下啦～ 以后慢慢和我说说你的故事吧。`;
                // 生成第一条转述式记忆
                newMemory = `你说过“${message}”`;
            }
        } else {
            // 有记忆时的回复，结合记忆生成
            const randomMem = memories[Math.floor(Math.random() * memories.length)];
            if (message.includes('记得') || message.includes('记忆')) {
                reply = `我当然记得呀～ 你曾提到${randomMem.content.slice(5)}，这些我都记在心里呢。`;
            } else {
                reply = `收到你的话啦：“${message}”。我还记得你之前说过${randomMem.content.slice(5)}，最近有新的变化吗？`;
                // 生成新的转述式记忆
                newMemory = `你提到${message.length > 15 ? message.substring(0, 15) + '...' : message}`;
            }
        }

        // 模拟大模型调用延迟，提升真实感
        await new Promise(resolve => setTimeout(resolve, 800));

        return res.status(200).json({
            reply: reply,
            memory: newMemory // 仅返回转述式记忆内容，无分析字段
        });

    } catch (error) {
        console.error('API Handler Error:', error);
        return res.status(500).json({
            reply: '抱歉，我现在有点疲惫，稍后再和你深入聊聊吧～',
            memory: null
        });
    }
}