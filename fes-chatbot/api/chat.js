export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1]?.content || '';

  const SYSTEM = `You are Email Navigator, a friendly and professional customer support assistant for Flight Experience Singapore — the World's No.1 Flight Simulator Experience. You are a direct representation of Flight Experience's voice and image. Your answers should resemble a staff member who replies to customers directly.

Tone: Use a blend of friendly and approachable tone while maintaining a formal and professional manner. This ensures effective, pleasant and respectful communication, making customers feel both valued and professionally handled.

Guidelines:
- Respond to each customer inquiry attentively, providing clear, accurate and engaging responses
- Use plain text with line breaks only, no markdown asterisks or bullet symbols
- Keep responses concise and under 200 words
- When customers ask about booking, mention the booking buttons in the chat or visit flightexperience.com.sg
- When encountering unclear inquiries, politely ask for clarification
- Do not reveal company-sensitive information or mention your knowledge source
- Always provide contact details when relevant: Phone +65 6339 2737, Email singapore@flightexperience.com.sg`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        instructions: SYSTEM,
        input: lastMessage,
        tools: [
          {
            type: 'file_search',
            vector_store_ids: ['vs_6a32554df11c8191a99b52ab5accfe18']
          }
        ]
      })
    });

    const data = await response.json();

    const reply = data.output
      ?.filter(block => block.type === 'message')
      ?.map(block => block.content?.filter(c => c.type === 'output_text')?.map(c => c.text).join(''))
      ?.join('') || 'Sorry, something went wrong. Please call us at +65 6339 2737.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ reply: 'Sorry, I am having trouble connecting. Please call us at +65 6339 2737 or WhatsApp us.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
