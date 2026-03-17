// app/api/parse-pref/route.js
// NON-STRAIGHTFORWARD LLM #2: free-text mood → structured JSON weights + filters
// Tools pattern: LLM output directly feeds downstream scoring algorithm

import OpenAI from "openai";

const DEFAULT = { weights: { cuisine:0.40, rating:0.30, price:0.20, distance:0.10 }, filters: {}, summary_label: null };

export async function POST(request) {
  const { text } = await request.json();
  const key = process.env.OPENAI_API_KEY;
  if (!key || !text?.trim()) return Response.json(DEFAULT);

  try {
    const openai = new OpenAI({ apiKey: key });
    const prompt = `You are a preference extraction engine for a restaurant recommendation system.
The user said: "${text}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "weights": {
    "cuisine": <float 0.0-0.6>,
    "rating":  <float 0.0-0.6>,
    "price":   <float 0.0-0.4>,
    "distance":<float 0.0-0.3>
  },
  "filters": {
    "price_max": <1-4 or null>,
    "quiet":     <true or false>,
    "open_now":  <true or false>,
    "dietary":   <"vegan"|"seafood"|null>
  },
  "summary_label": "<3-5 word vibe label, e.g. 'Quiet business lunch'>"
}
Rules: weights must sum to 1.0. Cheap→high price weight+price_max 1-2. Quality→high rating weight. Nearby→high distance weight. Quiet/calm/work→quiet=true.`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.2,
    });

    let raw = resp.choices[0].message.content.trim().replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(raw);

    // Normalise weights to sum exactly 1.0
    const w = parsed.weights || {};
    const total = Object.values(w).reduce((a,b)=>a+b, 0);
    if (Math.abs(total - 1.0) > 0.05) {
      for (const k in w) w[k] = Math.round(w[k]/total*1000)/1000;
    }

    return Response.json({ weights: w, filters: parsed.filters || {}, summary_label: parsed.summary_label });
  } catch {
    return Response.json(DEFAULT);
  }
}
