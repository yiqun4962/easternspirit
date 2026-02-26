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

        let userName = null;
        for (const mem of memories) {
            const nameMatch = mem.content.match(/你叫(.*)/) || mem.content.match(/我是(.*)/);
            if (nameMatch) {
                userName = nameMatch[1].trim();
                break;
            }
        }

        const newNameMatch = message.match(/我叫(.*)/) || message.match(/我是(.*)/);
        if (newNameMatch) {
            const newName = newNameMatch[1].trim();
            newMemory = `你叫${newName}`;
            reply = `你好。`;
        } 
        else if (message.includes('你好') || message.includes('嗨') || message.includes('在吗')) {
            reply = userName ? `${userName}，我在。` : `我在呢。`;
        }
        else if (message.includes('喜欢')) {
            reply = userName ? 
                `${userName}，这种偏爱很有意思。` : 
                `这种偏爱很有意思。`;
            newMemory = `你提到${message}`;
        }
        else {
            const baseReplies = [
                `嗯。`,
                `原来如此。`,
                `我明白你的意思了。`,
                `这样啊。`
            ];
            reply = userName ? 
                `${userName}，${baseReplies[Math.floor(Math.random() * baseReplies.length)]}` : 
                baseReplies[Math.floor(Math.random() * baseReplies.length)];

            if (memories.length > 0 && Math.random() > 0.7) {
                const lastMem = memories[memories.length - 1].content.replace(/你叫|你提到/g, '').trim();
                if (!lastMem.includes('你叫') && !lastMem.includes('我是')) {
                    reply += ` 对了，上次说的${lastMem}，后来怎么样了？`;
                }
            }

            newMemory = `你提到${message}`;
        }

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