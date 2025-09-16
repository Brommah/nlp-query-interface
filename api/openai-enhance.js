export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { question, context } = req.body;
        
        const prompt = `You are an expert community analyst. Based on the topic tree data provided, answer this question with deep insights:

Question: "${question}"

Context:
- Messages: ${context.messageCount}
- Topics: ${context.topicCount}
- Users: ${context.activeUsers}

Topic Analysis:
${context.topics.map(topic => 
    `- ${topic.name}: ${topic.messageCount} messages from ${topic.contributorCount} contributors`
).join('\n')}

User Engagement:
${context.topics.map(topic => 
    `- ${topic.name}: ${topic.contributors.map(c => `${c.username} (${c.messageCount})`).join(', ')}`
).join('\n')}

Please provide a concise, business-focused analysis that directly answers the question. Focus on:
1. Specific patterns and behaviors
2. Actionable insights for community management
3. Clear, professional language
4. Quantified observations where possible

Response format: Provide a single, comprehensive paragraph (maximum 150 words) that directly answers the question.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional community intelligence analyst. Provide clear, actionable insights based on conversation data.'
                    },
                    {
                        role: 'user', 
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const aiInsights = data.choices[0].message.content;
        
        res.status(200).json({ 
            success: true, 
            insights: aiInsights.trim() 
        });
        
    } catch (error) {
        console.error('OpenAI enhancement failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
