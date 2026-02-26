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

        // 1. 首次对话 / 无记忆时的回复
        if (memories.length === 0) {
            if (message.includes('你好') || message.includes('嗨') || message.includes('hello') || message.includes('在吗')) {
                reply = '你好呀～ 我是东方灵侍，很高兴和你聊天。';
            } else if (message.includes('名字') || message.includes('我是谁') || message.includes('我叫')) {
                const nameMatch = message.match(/我叫(.*)/);
                const name = nameMatch ? nameMatch[1] : '你';
                reply = `你好呀，${name}。很高兴认识你，以后我会记得你的名字的。`;
                newMemory = `你叫${name}`;
            } else if (message.includes('现在不能聊吗')) {
                reply = '当然可以聊呀，我一直都在。你现在想聊点什么呢？';
            } else {
                reply = `我听到你说“${message}”了。可以多和我说说吗？`;
                newMemory = `你提到“${message}”`;
            }
        } else {
            // 2. 有记忆时的回复，结合上下文
            const lastMemory = memories[memories.length - 1];

            if (message.includes('你好') || message.includes('嗨') || message.includes('hello') || message.includes('在吗')) {
                reply = '我在呢，有什么想聊的吗？';
            } else if (message.includes('名字') || message.includes('我是谁') || message.includes('我叫')) {
                const nameMatch = message.match(/我叫(.*)/);
                const name = nameMatch ? nameMatch[1] : '你';
                reply = `好的，我记住了，你叫${name}。以后我会这样称呼你。`;
                newMemory = `你叫${name}`;
            } else if (message.includes('现在不能聊吗')) {
                reply = '当然可以聊呀，我一直都在。你现在想聊点什么呢？';
            } else if (lastMemory.content.includes('你叫')) {
                // 如果上一条记忆是名字，就用名字回应
                const name = lastMemory.content.replace('你叫', '');
                reply = `${name}，我听到你说“${message}”了。可以多和我说说吗？`;
                newMemory = `你提到“${message}”`;
            } else {
                // 通用回复，引用上一条记忆
                const lastContent = lastMemory.content.replace('你提到', '').replace(/“”/g, '');
                reply = `我听到你说“${message}”了。我还记得你之前提到${lastContent}，最近有什么新的想法吗？`;
                newMemory = `你提到“${message}”`;
            }
        }

        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 800));

        return res.status(200).json({
            reply: reply,
            memory: newMemory
        });

    } catch (error) {
        console.error('API Handler Error:', error);
        return res.status(500).json({
            reply: '抱歉，我现在有点疲惫，稍后再和你深入聊聊吧～',
            memory: null
        });
    }
}