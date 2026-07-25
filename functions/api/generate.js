// Cloudflare Pages Function — runs at /api/generate
// This is the piece that lets the PUBLIC use the app with no API key of their own.
// The real Gemini key lives only here, as a server-side environment variable
// (set in the Cloudflare dashboard, never committed to git).

// Forces Gemini to fill in exactly this shape — this is what prevents the
// "Expected ',' or '}' after property value" JSON parse errors, since the
// model can no longer freeform its way into broken JSON around the multi-line letter text.
const RIGHTSDESK_SCHEMA = {
  type: "OBJECT",
  properties: {
    rights: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          statute: { type: "STRING" },
          title: { type: "STRING" },
          explanation: { type: "STRING" },
        },
        required: ["statute", "title", "explanation"],
      },
    },
    letter: { type: "STRING" },
    escalation: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["step", "detail"],
      },
    },
  },
  required: ["rights", "letter", "escalation"],
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY; // set this in Cloudflare Pages → Settings → Environment variables

    if (!apiKey) {
      return jsonResponse({ error: "Server is not configured with an API key yet." }, 500);
    }

    const { systemInstruction, userPrompt } = await request.json();

    if (!userPrompt) {
      return jsonResponse({ error: "Missing userPrompt." }, 400);
    }

    const GEMINI_MODEL = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RIGHTSDESK_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return jsonResponse({ error: `Gemini API error ${geminiRes.status}: ${errText.slice(0, 300)}` }, 502);
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return jsonResponse({ error: "Empty response from model." }, 502);
    }

    return jsonResponse({ result: text }, 200);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}