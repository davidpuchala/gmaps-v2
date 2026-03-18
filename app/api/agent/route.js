// app/api/agent/route.js
// Real agentic loop: Claude autonomously calls search_places, reasons about
// results, and iterates until it finds the 3 best matches for the user's request.

import Anthropic from "@anthropic-ai/sdk";

// ── Shared Places helpers (mirrors places/route.js logic) ─────────────────────
const NON_FOOD = new Set(["lodging","hotel","spa","gym","clothing_store","store",
  "supermarket","school","hospital","bank","movie_theater","night_club","museum","place_of_worship"]);
const FOOD = new Set(["restaurant","food","bar","cafe","bakery","meal_takeaway",
  "japanese_restaurant","sushi_restaurant","spanish_restaurant","italian_restaurant",
  "french_restaurant","mediterranean_restaurant","seafood_restaurant","steak_house",
  "vegan_restaurant","vegetarian_restaurant","fast_food_restaurant","breakfast_restaurant"]);

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

async function searchPlaces(keyword, lat, lng, radius) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const base = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${key}`;
  const kw   = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";

  const [r1, r2] = await Promise.all([
    fetch(`${base}&type=restaurant${kw}`).then(r => r.json()).catch(() => ({ results: [] })),
    fetch(`${base}&type=cafe${kw}`).then(r => r.json()).catch(() => ({ results: [] })),
  ]);

  const seen = new Set();
  return [...(r1.results || []), ...(r2.results || [])]
    .filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      if ((p.types || []).includes("lodging")) return false;
      const types = (p.types || []).filter(t => !NON_FOOD.has(t));
      if (!types.some(t => FOOD.has(t))) return false;
      if ((p.rating || 0) < 4.0 || (p.user_ratings_total || 0) < 50) return false;
      return true;
    })
    .slice(0, 20)
    .map(p => {
      const loc  = p.geometry?.location || {};
      const dist = haversine(lat, lng, loc.lat || lat, loc.lng || lng);
      const vic  = p.vicinity || "Barcelona";
      const nbhd = vic.includes(",") ? vic.split(",").at(-2)?.trim() : vic;
      return {
        place_id:      p.place_id,
        name:          p.name,
        types:         (p.types || []).filter(t => !NON_FOOD.has(t)),
        rating:        p.rating || 3.5,
        reviews_count: p.user_ratings_total || 0,
        price_level:   p.price_level || 2,
        open_now:      true,
        photo_url:     null,
        neighborhood:  nbhd || "Barcelona",
        distance_m:    dist,
        lat:           loc.lat,
        lng:           loc.lng,
      };
    });
}

// ── Agent tool definition ─────────────────────────────────────────────────────
const TOOLS = [{
  name: "search_places",
  description: "Search for restaurants near the user using Google Places. Call this with specific keywords to find restaurants matching certain cuisine, vibe, or criteria. Returns a list of nearby matching restaurants with ratings, price levels, and distances.",
  input_schema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "Search term, e.g. 'pizza', 'sushi', 'romantic dinner', 'vegan brunch', 'tapas bar'. Be specific and try different keywords if first results aren't ideal.",
      },
    },
    required: ["keyword"],
  },
}];

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const { text, profile, lat, lng, radius, existingRestaurants, modeContext, advanced } = await request.json();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ picks: [], summary: null, allRestaurants: existingRestaurants || [] });

  const client = new Anthropic({ apiKey: key });

  // Build context from already-loaded restaurants (agent can use these without searching)
  const existingCtx = existingRestaurants?.length
    ? `\n\nRestaurants already loaded in the user's current radius:\n` +
      existingRestaurants.map(r =>
        `- ${r.name} | ${r.types?.slice(0,2).join(", ")} | ★${r.rating} | ${"€".repeat(r.price_level||2)} | ${r.distance_m}m`
      ).join("\n")
    : "";

  const system = `You are a restaurant recommendation agent for Barcelona, Spain.

User taste profile: loves ${profile?.topCuisines?.slice(0,3).join(", ") || "varied cuisine"}, preferred price ${"€".repeat(profile?.preferredPrice||2)} (${profile?.preferredPrice||2}/4).
User location: ${lat}, ${lng}. Search radius: ${radius}m.${existingCtx}

${advanced?.price_max ? `Hard constraint: budget per person ≤ ${advanced.price_max === 1 ? "~€20" : advanced.price_max === 2 ? "~€35" : "~€60"} (Google price level ≤ ${advanced.price_max}). IMPORTANT: Google price_level is only an approximation. Cross-reference your own knowledge of the restaurant's actual typical spend — if you know the place is more expensive than the budget allows, exclude it even if its price_level appears to fit.` : ""}
${advanced?.vibe === "quiet" ? "Hard constraint: only suggest quiet, low-key places (few reviews, not crowded)." : advanced?.vibe === "lively" ? "Hard constraint: only suggest lively, buzzing places (many reviews, energetic atmosphere)." : ""}
${advanced?.open_now ? "Hard constraint: only suggest places that are currently open." : ""}

Your goal: find the 3 best restaurants for the user's request.
- First check if the already-loaded restaurants satisfy the request. If yes, pick from them.
- If not, use search_places to find better options. You may search up to 3 times with different keywords.
- Consider rating, price, distance, and how well the place matches the request.
${modeContext === "trending"
  ? `- TRENDING MODE: prioritise places with the highest review counts (500+ reviews). These are buzzing, popular spots everyone is talking about. Search for "popular", "best", "trendy" restaurants. Avoid low-review-count places.`
  : modeContext === "hidden"
  ? `- HIDDEN GEM MODE: prioritise places with high rating (4.4+) but relatively few reviews (under 300). These are underrated local secrets not yet overrun by tourists. Avoid places with 500+ reviews. Search for "local", "authentic", "neighbourhood" restaurants.`
  : ""}
- Once you have identified the best 3, respond ONLY with this exact JSON (no markdown, no explanation):
{"picks":["Exact Name 1","Exact Name 2","Exact Name 3"],"reasons":["why #1 fits","why #2 fits","why #3 fits"],"summary":"3-5 word label"}`;

  const messages = [{ role: "user", content: `Find me: "${text}"` }];
  const allRestaurants = [...(existingRestaurants || [])];

  // ── Agentic loop (max 8 turns to stay within budget) ─────────────────────
  for (let turn = 0; turn < 8; turn++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // Agent finished — extract final JSON answer
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(b => b.type === "text")?.text || "";
      try {
        const json = JSON.parse(textBlock.match(/\{[\s\S]*\}/)?.[0] || "{}");
        const basePicks = (json.picks || []).map((name, i) => {
          const found = allRestaurants.find(r =>
            r.name === name ||
            r.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(r.name.toLowerCase())
          );
          return found
            ? { ...found, explanation: json.reasons?.[i] || null, matchPct: 95 - i * 3 }
            : null;
        }).filter(Boolean);

        // Enrich picks with photo + open_now from Places Details
        const gKey = process.env.GOOGLE_PLACES_API_KEY;
        const picks = await Promise.all(basePicks.map(async r => {
          if (!gKey || !r.place_id) return r;
          try {
            const det = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.place_id}&fields=opening_hours,photos&key=${gKey}`
            ).then(res => res.json());
            const result   = det.result || {};
            const photoRef = result.photos?.[0]?.photo_reference;
            return {
              ...r,
              open_now:  result.opening_hours?.open_now ?? r.open_now,
              photo_url: photoRef ? `/api/photo?ref=${encodeURIComponent(photoRef)}` : null,
            };
          } catch { return r; }
        }));

        return Response.json({ picks, summary: json.summary, allRestaurants });
      } catch {
        return Response.json({ picks: [], summary: null, allRestaurants });
      }
    }

    // Agent called a tool — execute it and feed results back
    if (response.stop_reason === "tool_use") {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        if (block.name === "search_places") {
          const results = await searchPlaces(block.input.keyword, lat, lng, radius);
          // Merge new results into pool (dedup by place_id)
          for (const r of results) {
            if (!allRestaurants.find(e => e.place_id === r.place_id)) allRestaurants.push(r);
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: results.length
              ? JSON.stringify(results.map(r => ({
                  name: r.name,
                  types: r.types?.slice(0, 3),
                  rating: r.rating,
                  price_level: r.price_level,
                  distance_m: r.distance_m,
                  reviews_count: r.reviews_count,
                })))
              : "No results found for this keyword.",
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
  }

  return Response.json({ picks: [], summary: null, allRestaurants });
}
