/* RightsDesk — app.js
   Free stack, publicly usable with no key from the visitor:
   the browser calls OUR serverless function at /api/generate
   (functions/api/generate.js), which holds the real Gemini key
   server-side as an environment variable. Visitors never see it.

   Local testing note: /api/generate only runs once deployed on
   Cloudflare Pages (or when using their CLI). If you're just using
   VS Code Live Server locally, the function endpoint won't exist —
   use the optional "local dev key" in Settings to call Gemini
   directly from the browser instead, just for testing on your machine.
   ------------------------------------------------------------------
   TODO for later (see PROJECT_SUMMARY.md for full roadmap):
   - Add a "generate PDF" export using a free lib like jsPDF.
   - Add multi-language support (Gemini can translate the letter too).
   - Add basic abuse protection to the function (rate limit per IP).
*/

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Must match functions/api/generate.js — forces valid JSON, prevents parse errors
// caused by the multi-line letter text breaking freeform JSON structure.
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

let LAW_DATA = null;

// ---------- Settings panel ----------

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");

// This "local dev key" is ONLY used for testing in VS Code Live Server, where
// /api/generate doesn't exist yet. On the real deployed site, leave this empty —
// every visitor is served through the server-side function instead, with no key of their own.

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
  const savedKey = localStorage.getItem("rightsdesk_gemini_key");
  if (savedKey) apiKeyInput.value = savedKey;
});

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem("rightsdesk_gemini_key", key);
    settingsPanel.classList.add("hidden");
    setStatus("API key saved.");
  }
});

function getApiKey() {
  return localStorage.getItem("rightsdesk_gemini_key") || "";
}

// ---------- Load grounding data ----------

async function loadLawData() {
  const res = await fetch("data/mi_tenant_law.json");
  LAW_DATA = await res.json();
}
loadLawData();

// ---------- Form handling ----------

const form = document.getElementById("intakeForm");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusLine = document.getElementById("statusLine");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

function setStatus(msg, isError = false) {
  statusLine.textContent = msg;
  statusLine.style.color = isError ? "#B4432F" : "#A97A28";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!LAW_DATA) {
    setStatus("Still loading legal data, try again in a second.", true);
    return;
  }

  const payload = {
    issue: document.getElementById("issue").value.trim(),
    startDate: document.getElementById("startDate").value,
    notifiedBefore: document.getElementById("notifiedBefore").value,
    tenantName: document.getElementById("tenantName").value.trim() || "[Your Name]",
    landlordName: document.getElementById("landlordName").value.trim() || "[Landlord / Property Name]",
    address: document.getElementById("address").value.trim() || "[Your Rental Address]",
  };

  if (!payload.issue) {
    setStatus("Describe the problem first.", true);
    return;
  }

  analyzeBtn.disabled = true;
  setStatus("Analyzing your rights and drafting your letter...");

  try {
    const result = await callGemini(payload);
    renderResult(result, payload);
    setStatus("Done. Review the letter before sending it.");
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong calling the AI: " + err.message, true);
  } finally {
    analyzeBtn.disabled = false;
  }
});

// ---------- Gemini call ----------

async function callGemini(payload) {
  const today = new Date().toISOString().split("T")[0];

  const systemInstruction = `You are RightsDesk, an assistant that helps Michigan renters understand
their rights and draft a formal written notice to their landlord. You must ONLY rely on the legal
information provided below — do not invent statutes, deadlines, or facts not present here.

MICHIGAN TENANT LAW REFERENCE DATA:
${JSON.stringify(LAW_DATA, null, 2)}

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "rights": [ { "statute": "string", "title": "string", "explanation": "one or two plain-English sentences" } ],
  "letter": "the full text of a formal written notice, ready to send, addressed from the tenant to the landlord",
  "escalation": [ { "step": "string title", "detail": "one sentence, plain English" } ]
}

Rules for the letter:
- Business-letter format: date, tenant info, landlord/property info, subject line, body, closing.
- State the problem factually, reference the relevant Michigan statute(s) by MCL number, state a
  specific reasonable deadline to respond (based on the reference data), and state that the tenant
  is documenting this in writing per Michigan law.
- Calm and professional tone. Not aggressive. Not threatening.
- Use today's date: ${today}.
- Pick 2-4 of the most relevant rights from the reference data for the "rights" array, not all of them.
- Pick 2-3 of the most relevant escalation steps, in order.`;

  const userPrompt = `Tenant situation:
- Problem: ${payload.issue}
- Problem started: ${payload.startDate || "not specified"}
- Already notified landlord? ${payload.notifiedBefore}
- Tenant name: ${payload.tenantName}
- Landlord / property: ${payload.landlordName}
- Rental address: ${payload.address}`;

  const localDevKey = getApiKey();

  if (!localDevKey) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction, userPrompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return safeJsonParse(data.result);
  }

  const res = await fetch(`${GEMINI_URL}?key=${localDevKey}`, {
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

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from model.");

  return safeJsonParse(text);
}

// Belt-and-suspenders: the schema above should make this unnecessary, but if
// Gemini ever wraps the JSON in markdown fences or adds stray whitespace,
//
// ---------- Helper functions ----------

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    // Strip markdown formatting if Gemini wrapped the JSON in code blocks
    const cleaned = str.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  }
}
// Demo scenario auto-fill
const demoBtn = document.getElementById("demoBtn");
if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    document.getElementById("issue").value = "Our main building heat went completely out 3 weeks ago during freezing weather. I've sent two text messages to management, but nobody has come to inspect or fix it. The apartment temperature is consistently below 55 degrees.";
    document.getElementById("startDate").value = "2026-07-01";
    document.getElementById("notifiedBefore").value = "verbal";
    document.getElementById("tenantName").value = "Alex Morgan";
    document.getElementById("landlordName").value = "Residences of Troy Apartments Management";
    document.getElementById("address").value = "2865 Troy Center Dr, Troy, MI 48084";
    if (typeof setStatus === "function") {
      setStatus("Sample scenario loaded! Click 'Analyze & draft my letter'.");
    }
  });
}
function renderResult(data, payload) {
  emptyState.classList.add("hidden");
  resultContent.classList.remove("hidden");

  // Render rights
  const rightsDiv = document.getElementById("rightsExplanation");
  rightsDiv.innerHTML = "<ul>" + data.rights.map(r => 
    `<li><strong>${r.title}</strong> <span class="statute-tag">${r.statute}</span><br>${r.explanation}</li>`
  ).join("") + "</ul>";

  // Render letter & update stamp
  const letterBody = document.getElementById("letterBody");
  letterBody.textContent = data.letter;
  
  const stamp = document.getElementById("letterStamp");
  stamp.textContent = "READY TO SEND";
  stamp.classList.add("ready");

  // Render escalation steps
  const escalationDiv = document.getElementById("escalationSteps");
  escalationDiv.innerHTML = data.escalation.map((e, idx) => `
    <div class="escalation-step">
      <div class="escalation-num">${idx + 1}</div>
      <div class="escalation-text">
        <strong>${e.step}</strong>
        <span>${e.detail}</span>
      </div>
    </div>
  `).join("");
  // --- PASTE STARTS HERE ---
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(data.letter);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✓ Copied!";
      if (typeof setStatus === "function") setStatus("Letter copied to clipboard!");
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    };
  }

  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.onclick = () => {
      window.print();
    };
  }

  const emailBtn = document.getElementById("emailBtn");
  if (emailBtn) {
    emailBtn.onclick = () => {
      const subject = encodeURIComponent("Formal Notice: Lease Unit Repair Request");
      const body = encodeURIComponent(data.letter);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };
  }
}