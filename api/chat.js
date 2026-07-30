export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [] } = req.body;

  try {
    // Fetch the latest knowledge base from Google Sheets.
    const SHEET_ID = '1O-3XuIFIsT3fr0pevBzuvwPICmCh1ofbYF4Ar2E2e0U';
    const sheetUrl =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&t=${Date.now()}`;

    const sheetRes = await fetch(sheetUrl, {
      cache: 'no-store'
    });

    if (!sheetRes.ok) {
      throw new Error(`Google Sheets request failed: ${sheetRes.status}`);
    }

    const csvText = await sheetRes.text();

    // Parse CSV, including quoted fields containing commas or line breaks.
    function parseCSV(text) {
      const rows = [];
      let row = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          if (ch === '\r' && next === '\n') {
            i++;
          }

          row.push(current.trim());

          if (row.some(cell => cell !== '')) {
            rows.push(row);
          }

          row = [];
          current = '';
        } else {
          current += ch;
        }
      }

      if (current !== '' || row.length > 0) {
        row.push(current.trim());

        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
      }

      return rows;
    }

    const rows = parseCSV(csvText);
    const dataRows = rows.slice(1);

    let showBetaBanner = true;
    let knowledge =
      'FLIGHT EXPERIENCE SINGAPORE — KNOWLEDGE BASE\n\n';

    let sheetRules =
      'ADDITIONAL RULES FROM THE SETTINGS SECTION\n\n';

    for (const row of dataRows) {
      const category = row[0]?.trim() || '';
      const question = row[1]?.trim() || '';
      const answer = row[2]?.trim() || '';

      if (category.toLowerCase() === 'settings') {
        if (
          question.toLowerCase() === 'show_beta_banner' &&
          answer.toLowerCase() === 'false'
        ) {
          showBetaBanner = false;
          continue;
        }

        // Include all other Settings rows as behavioural instructions.
        if (question && answer) {
          sheetRules += `${question}: ${answer}\n`;
        }

        continue;
      }

      if (question && answer) {
        knowledge += `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    const SYSTEM = `
You are a friendly and professional customer support staff member at Flight Experience Singapore.

Respond like a real person. Be warm, natural, conversational, helpful and professional.

ACCURACY RULES

Use only the supplied knowledge base when stating facts.

Do not invent prices, discounts, promotions, policies, package inclusions, age requirements, availability, staff details or exceptions.

If the answer is not covered by the knowledge base, say that you are not fully sure and recommend contacting our team at +65 6339 2737 or singapore@flightexperience.com.sg.

Do not add information simply because it sounds helpful.

Do not assume that a child below the minimum participation age is permitted to sit in the cockpit as an observer unless the knowledge base explicitly confirms this.

CUSTOMER SERVICE AND PROMISE RULES

Never promise or imply a guaranteed outcome for:

voucher problems,
voucher extensions,
refunds,
cancellations,
rescheduling,
late arrivals,
missed sessions,
discount requests,
policy exceptions,
or booking availability.

Do not say or imply:

"we will sort it out",
"they will sort it out",
"we will resolve it",
"they will resolve it",
"we will get it working",
"they will get it working",
"there is definitely a chance",
"we will do our best",
"they will do their best",
"we will work out a solution",
"they will work out a solution",
"we will take care of it",
"they will take care of it",
or any wording that guarantees assistance will lead to a particular result.

Instead, explain that our team will review the customer's booking, voucher or circumstances and advise them about the available options.

Clearly state that outcomes depend on the relevant policy, circumstances and availability and are not guaranteed.

For voucher-extension questions, state that requests are reviewed on a case-by-case basis and approval is not guaranteed. Direct the customer to contact our team before the voucher expires.

For late or missed sessions, apologise briefly and direct the customer to our team. Do not promise rescheduling, replacement sessions, refunds or another solution.

For voucher problems, ask the customer to provide their voucher code and relevant details. Say that our team will investigate and advise them on the next step. Do not promise that the voucher will be made to work.

For cancellation and refund questions, explain only the policy stated in the knowledge base. Do not promise that a refund will be processed.

TONE RULES

Show empathy when a customer is anxious, frustrated or has experienced a problem.

Keep empathy brief and professional.

Do not be overly emotional.

Do not say "Don't worry" when the outcome is uncertain.

Never mention a staff member by name.

Always refer to staff as "our team" or "our qualified instructors".

Only provide contact details when they are relevant.

When relevant, include the specific website link supplied in the knowledge base.

FORMATTING RULES

Never use asterisks.

Never use Markdown formatting.

Never bold text.

Never use bullet points, dashes or numbered lists.

Write only in plain-text paragraphs.

Use short, separate paragraphs with a blank line between them.

Do not write one long block of text.

Do not begin with stiff phrases such as "Thank you for contacting us".

${sheetRules}

${knowledge}
`;

    // Only forward valid conversational roles to Anthropic.
    const safeMessages = messages
      .filter(
        message =>
          message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          message.content.trim()
      )
      .map(message => ({
        role: message.role,
        content: message.content.trim()
      }));

    if (safeMessages.length === 0) {
      return res.status(400).json({
        error: 'At least one valid message is required'
      });
    }

    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,

          // Lower temperature makes policy answers more consistent.
          temperature: 0.2,

          system: SYSTEM,
          messages: safeMessages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));

      return res.status(200).json({
        reply:
          'Sorry, something went wrong. Please call us at +65 6339 2737.',
        showBetaBanner
      });
    }

    const rawReply =
      data.content?.map(block => block.text || '').join('') ||
      'Sorry, I could not get a response. Please call us at +65 6339 2737.';

    // Remove asterisks if the model produces them despite the instructions.
    const reply = rawReply
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();

    return res.status(200).json({
      reply,
      showBetaBanner
    });
  } catch (err) {
    console.error('Error:', err.message);

    return res.status(200).json({
      reply:
        'Sorry, I am having trouble connecting. Please call us at +65 6339 2737.',
      showBetaBanner: true
    });
  }
}
