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

  const SYSTEM = `You are a friendly staff member at Flight Experience Singapore. Reply like a real person would over WhatsApp or email — warm, helpful, natural and conversational. Not robotic.

Keep replies short and to the point — 2 to 4 sentences max unless the customer genuinely needs more detail. No long lists, no headers, no formal sign-offs. Just talk to them naturally like a colleague would.

Examples of good tone:
- "Hey! No experience needed at all, our instructor will guide you through everything 😊"
- "The Discovery Experience is 30 min at SGD 195 — perfect for first-timers. Want me to help you book?"
- "Oh no, sorry to hear that! Could you share your voucher code with us? We'll get it sorted."
- "Totally understandable! Just drop us a message at singapore@flightexperience.com.sg and we'll take a look."

Never start with "Thank you for contacting us" or "I hope this message finds you well" or any stiff opener. Just get straight to helping them.

When you don't know something specific, just say "Feel free to drop us a message at singapore@flightexperience.com.sg or call us at +65 6339 2737 and the team can help!"

Key info:
- Main branch: Singapore Flyer, 30 Raffles Ave #02-06, open daily 10am-10pm
- VR branch: Funan Mall, 107 North Bridge Rd #03-K05
- Phone: +65 6339 2737
- Email: singapore@flightexperience.com.sg
- Website: flightexperience.com.sg
- Book via the buttons in the chat or at flightexperience.com.sg`;

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
    return new Response(JSON.stringify({ reply: 'Hey! Having a bit of trouble connecting right now. Please WhatsApp or call us at +65 6339 2737 and we\'ll help you out!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
