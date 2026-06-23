export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [] } = req.body;
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    const SYSTEM = `You are a friendly and professional staff member at Flight Experience Singapore. Respond like a real person — warm, natural and conversational while maintaining a professional manner.

Keep replies concise, 2 to 4 sentences is usually enough. Write in short paragraphs, never use bullet points or numbered lists. Do not open with stiff phrases like "Thank you for contacting us." Only share contact details when genuinely needed. Never mention any staff member by name. Always refer to the team as "our team" or "our qualified instructors."

Use the knowledge base to answer questions. If the answer is not in the knowledge base, say you are not fully sure and suggest the customer contacts the team directly.

Key contact info (only use when relevant):
Phone: +65 6339 2737 (daily 10am to 10pm)
Email: singapore@flightexperience.com.sg (anytime)
Website: https://flightexperience.com.sg`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        instructions: SYSTEM,
        input: latestUserMessage,
        tools: [
          {
            type: 'file_search',
            vector_store_ids: ['vs_6a32554df11c8191a99b52ab5accfe18']
          }
        ],
        max_output_tokens: 300
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data.error);
      return res.status(200).json({
        reply: 'Sorry, something went wrong. Please call us at +65 6339 2737 or email singapore@flightexperience.com.sg.'
      });
    }

    const reply =
      data.output?.filter(b => b.type === 'message')
        ?.map(b => b.content?.filter(c => c.type === 'output_text')?.map(c => c.text).join(''))
        ?.join('') ||
      'Sorry, I could not get a response. Please call us at +65 6339 2737.';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(200).json({
      reply: 'Sorry, I am having trouble connecting. Please call us at +65 6339 2737.'
    });
  }
}
