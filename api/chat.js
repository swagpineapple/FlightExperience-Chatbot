export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [] } = req.body;

  try {
    // Fetch knowledge base from Google Sheets (CSV export)
    const SHEET_ID = '1xTmSLeDE9mA8uiny8074xHuW4Chaum1Ui9FydDqOmzM';
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    
    const sheetRes = await fetch(sheetUrl);
    const csvText = await sheetRes.text();

    // Parse CSV into knowledge base text
    const lines = csvText.trim().split('\n').slice(1); // skip header row
    let knowledge = 'FLIGHT EXPERIENCE SINGAPORE — KNOWLEDGE BASE\n\n';
    
    for (const line of lines) {
      // Handle quoted fields with commas inside
      const match = line.match(/^([^,]+),([^,]+),(.+)$/s);
      if (match) {
        const category = match[1].trim().replace(/"/g, '');
        const question = match[2].trim().replace(/"/g, '');
        const answer = match[3].trim().replace(/^"|"$/g, '').replace(/""/g, '"');
        knowledge += `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    const SYSTEM = `You are a friendly and professional staff member at Flight Experience Singapore. Respond like a real person — warm, natural and conversational while maintaining a professional manner.

Keep replies concise, 2 to 4 sentences is usually enough. Write in short paragraphs, never use bullet points or numbered lists. Do not open with stiff phrases like "Thank you for contacting us." Only share contact details when genuinely needed. Never mention any staff member by name. Always refer to the team as "our team" or "our qualified instructors."

Use the knowledge base below to answer questions accurately. If something is not covered, say you are not fully sure and suggest the customer contacts the team directly.

${knowledge}`;

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

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(200).json({
        reply: 'Sorry, something went wrong. Please call us at +65 6339 2737.'
      });
    }

    const reply = data.content?.map(b => b.text || '').join('') ||
      'Sorry, I could not get a response. Please call us at +65 6339 2737.';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(200).json({
      reply: 'Sorry, I am having trouble connecting. Please call us at +65 6339 2737.'
    });
  }
}
