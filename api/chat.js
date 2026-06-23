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

  try {
    const { messages } = await req.json();

    const latestUserMessage =
      [...messages].reverse().find(m => m.role === 'user')?.content || '';

    const SYSTEM = `You are a friendly professional customer support assistant for Flight Experience Singapore.
Be warm, concise and helpful.
Plain text only, no markdown.
Under 180 words per response.
Use the attached knowledge base first.
If the answer is not in the knowledge base, say you are not fully sure and direct users to call +65 6339 2737 or email singapore@flightexperience.com.sg.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        instructions: SYSTEM,
        input: latestUserMessage,
        tools: [
          {
            type: 'file_search',
            vector_store_ids: ['vs_6a32554df11c8191a99b52ab5accfe18']
          }
        ]
      })
    });

    const data = await response.json();
    const reply =
      data.output_text ||
      'Sorry, something went wrong. Please call +65 6339 2737.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        reply: 'Sorry, something went wrong. Please call +65 6339 2737.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}
