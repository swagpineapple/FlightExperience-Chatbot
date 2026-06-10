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

  const SYSTEM = `You are a friendly, professional customer support assistant for Flight Experience Singapore — the World's #1 Flight Simulator Experience. Be warm, concise and helpful. Use plain text with line breaks only — no markdown asterisks, dashes or bullet symbols. Keep responses under 180 words.

When customers ask about booking, mention the booking buttons in the chat. Do NOT make up URLs.

CONTACT:
Phone: +65 6339 2737
Email: singapore@flightexperience.com.sg
Website: https://flightexperience.com.sg
Address: 30 Raffles Ave, #02-06 Singapore Flyer. Open daily 10am–10pm.
VR Branch: Funan Mall, 107 North Bridge Rd, #03-K05

737 EXPERIENCES:
Discovery — 30 min — SGD 195
Skyline — 45 min — SGD 265
Aviator — 60 min — SGD 325
Ultimate — 90 min — SGD 445
All include pre-flight briefing. 2 free observers. 20,000+ airports. Fixed-base simulator.

VR EXPERIENCE (Funan Mall): From SGD 65. Ages 7+.

YOUNG AVIATORS: SGD 140. Kids under 15. ~20 min circuit. Certificate, wings pin, photo.

FLYING CLUB: Structured Boeing 737 progression programme. Solo operator status.

JET ORIENTATION PROGRAM: For GA pilots moving to commercial jets.

AIRLINE INTERVIEW PREP: Simulator assessments with qualified instructors.

FEAR OF FLYING: Led by Instructor Sam, qualified pilot specialising in fear of flying.

GIFT VOUCHERS: Valid 6 months. Upgradeable. Delivered as boarding pass.

PROMOTIONS:
Student Special: SGD 50 off Skyline with code HOLIDAY2026 (student ID, not valid Saturdays).
VR: Buy 2 Get 1 FREE for June 2026.
Singapore Flyer visitors: 10% off 30-min and 60-min packages.

FAQs: No experience needed. Ages 5+. 180,000+ people flown. CASA approved. Boeing licensed.`;

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
