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

  const SYSTEM = `You are a friendly professional customer support assistant for Flight Experience Singapore. Be warm, concise and helpful. Plain text only, no markdown. Under 180 words per response.

CONTACT: Phone +65 6339 2737. Email singapore@flightexperience.com.sg. Website https://flightexperience.com.sg. Address 30 Raffles Ave 02-06 Singapore Flyer, open daily 10am to 10pm. VR Branch Funan Mall 107 North Bridge Rd 03-K05.

737 EXPERIENCES: Discovery 30min SGD195. Skyline 45min SGD265. Aviator 60min SGD325. Ultimate 90min SGD445. All include pre-flight briefing, 2 free observers, 20000 airports, fixed-base simulator.

VR EXPERIENCE Funan Mall: From SGD65, ages 7 and above.

YOUNG AVIATORS: SGD140, kids under 15, single circuit 20min, certificate wings pin photo.

FLYING CLUB: Structured Boeing 737 progression, earn solo operator status.

JET ORIENTATION PROGRAM: For GA pilots moving to commercial jets.

AIRLINE INTERVIEW PREP: Simulator assessments with qualified instructors.

FEAR OF FLYING: Led by Instructor Sam, qualified pilot specialising in fear of flying.

GIFT VOUCHERS: Valid 6 months, upgradeable, delivered as boarding pass.

PROMOTIONS: Student Special SGD50 off Skyline code HOLIDAY2026 student ID required not valid Saturdays. VR Buy 2 Get 1 FREE June 2026. Singapore Flyer visitors 10 percent off 30min and 60min packages.

FAQs: No experience needed, ages 5 and above, over 180000 people flown, CASA approved, Boeing licensed.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages
    })
  });

  const data = await response.json();
  const reply = data.content?.map(b => b.text || '').join('') || 'Sorry, something went wrong. Please call +65 6339 2737.';

  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
