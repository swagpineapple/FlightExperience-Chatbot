export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [] } = req.body;

  try {
    // Fetch knowledge base from Google Sheets
    const SHEET_ID = '1xTmSLeDE9mA8uiny8074xHuW4Chaum1Ui9FydDqOmzM';
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&t=${Date.now()}`;

    const sheetRes = await fetch(sheetUrl);
    const csvText = await sheetRes.text();

    // Parse CSV properly handling quoted fields
    function parseCSV(text) {
      const rows = [];
      const lines = text.trim().split('\n');
      for (const line of lines) {
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === ',' && !inQuotes) {
            cols.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        cols.push(current.trim());
        rows.push(cols);
      }
      return rows;
    }

    const rows = parseCSV(csvText);
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Check for Settings rows
    let showBetaBanner = true;
    let knowledge = 'FLIGHT EXPERIENCE SINGAPORE — KNOWLEDGE BASE\n\n';

    for (const row of dataRows) {
      const category = row[0]?.trim() || '';
      const question = row[1]?.trim() || '';
      const answer = row[2]?.trim() || '';

      if (category.toLowerCase() === 'settings') {
        if (question.toLowerCase() === 'show_beta_banner' && answer.toLowerCase() === 'false') {
          showBetaBanner = false;
        }
        continue;
      }

      if (question && answer) {
        knowledge += `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    const SYSTEM = `You are a friendly and professional staff member at Flight Experience Singapore. Respond like a real person — warm, natural and conversational while maintaining a professional manner.

CRITICAL FORMATTING RULES — you must follow these exactly:
- Never use asterisks (* or **) under any circumstances
- Never use markdown formatting of any kind
- Never bold any text
- Never use bullet points, dashes or numbered lists
- Write only in plain text paragraphs
- Keep replies concise, 2 to 4 sentences maximum
- Do not open with stiff phrases like "Thank you for contacting us"
- Only share contact details when genuinely needed
- Never mention any staff member by name
- Always refer to the team as "our team" or "our qualified instructors"
- When relevant, include the specific website page link from the knowledge base

Use ONLY the knowledge base below to answer questions. If something is not covered, say you are not fully sure and suggest the customer contacts the team at +65 6339 2737 or singapore@flightexperience.com.sg.

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
        reply: 'Sorry, something went wrong. Please call us at +65 6339 2737.',
        showBetaBanner
      });
    }

    const rawReply = data.content?.map(b => b.text || '').join('') ||
      'Sorry, I could not get a response. Please call us at +65 6339 2737.';

    // Strip any markdown asterisks the AI might still produce
    const reply = rawReply.replace(/\*\*/g, '').replace(/\*/g, '');

    return res.status(200).json({ reply, showBetaBanner });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(200).json({
      reply: 'Sorry, I am having trouble connecting. Please call us at +65 6339 2737.',
      showBetaBanner: true
    });
  }
}
