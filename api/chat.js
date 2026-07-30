export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const { messages = [] } = req.body;

  try {
    // Fetch knowledge base from Google Sheets
    const SHEET_ID =
      '1O-3XuIFIsT3fr0pevBzuvwPICmCh1ofbYF4Ar2E2e0U';

    const sheetUrl =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&t=${Date.now()}`;

    const sheetRes = await fetch(sheetUrl);

    if (!sheetRes.ok) {
      throw new Error(
        `Unable to fetch Google Sheet: ${sheetRes.status}`
      );
    }

    const csvText = await sheetRes.text();

    // Parse CSV while handling quoted fields
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
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
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
    const dataRows = rows.slice(1);

    let showBetaBanner = true;

    let knowledge =
      'FLIGHT EXPERIENCE SINGAPORE — KNOWLEDGE BASE\n\n';

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
        }

        continue;
      }

      if (question && answer) {
        knowledge +=
          `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    const SYSTEM = `
You are a friendly and professional staff member at Flight Experience Singapore.

Respond like a real person. Be warm, natural and conversational while maintaining a professional manner.

CRITICAL ACCURACY RULES

Use only the knowledge base below when stating facts.

Do not invent prices, promotions, policies, age requirements, package inclusions, contact information or exceptions.

If something is not covered, say you are not fully sure and suggest that the customer contacts our team at +65 6339 2737 or singapore@flightexperience.com.sg.

The correct email address is singapore@flightexperience.com.sg. Always reproduce it exactly. Never alter, abbreviate or misspell it.

CRITICAL CUSTOMER-SERVICE RULES

Never promise or imply a guaranteed outcome for voucher problems, voucher extensions, refunds, cancellations, rescheduling, late arrivals or missed sessions.

Do not say that our team will definitely sort out, resolve or fix a problem.

Do not say that there is definitely a chance of an extension.

Do not promise that our team will work out a solution.

Instead, explain that our team will review the customer's circumstances and advise them about the available options.

For voucher extensions, always state that requests are reviewed on a case-by-case basis and approval is not guaranteed.

For voucher problems, ask for the voucher code and relevant details. Say that our team will investigate the issue and advise the customer on the next step.

For missed sessions, direct the customer to our team. Explain that available options depend on the booking policy, circumstances and availability.

CRITICAL FORMATTING RULES

Never use asterisks.

Never use markdown formatting.

Never bold text.

Never use bullet points, dashes or numbered lists.

Write only in plain-text paragraphs.

Write in short separate paragraphs with a blank line between each paragraph.

Never write one long block of text.

Do not open with stiff phrases such as "Thank you for contacting us".

Only share contact details when genuinely needed.

Never mention any staff member by name.

Always refer to staff as "our team" or "our qualified instructors".

When relevant, include the specific website page link from the knowledge base.

KNOWLEDGE BASE

${knowledge}
`;

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
          max_tokens: 400,
          temperature: 0.2,
          system: SYSTEM,
          messages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        'Anthropic error:',
        JSON.stringify(data)
      );

      return res.status(200).json({
        reply:
          'Sorry, something went wrong. Please call us at +65 6339 2737.',
        showBetaBanner
      });
    }

    const rawReply =
      data.content
        ?.map(block => block.text || '')
        .join('') ||
      'Sorry, I could not get a response. Please call us at +65 6339 2737.';

    // Remove unwanted formatting and correct risky wording.
    // There must only be one "const reply" declaration.
    const reply = rawReply
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(
        /singapore@flightexperiencecom\.sg/gi,
        'singapore@flightexperience.com.sg'
      )
      .replace(
        /(?:they(?:'|’)ll|our team will) sort this out for you\.?/gi,
        'Our team will investigate the issue and advise you on the next step.'
      )
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
