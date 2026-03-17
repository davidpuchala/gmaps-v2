// lib/engine.js — Profile synthesis & weighted scoring (JS port of engine.py)

const CUISINE_ALIASES = {
  japanese_restaurant:      ["japanese_restaurant","sushi_restaurant","ramen_restaurant"],
  sushi_restaurant:         ["sushi_restaurant","japanese_restaurant"],
  bar:                      ["bar","spanish_restaurant"],
  spanish_restaurant:       ["spanish_restaurant","bar"],
  italian_restaurant:       ["italian_restaurant","pizza_restaurant"],
  mediterranean_restaurant: ["mediterranean_restaurant","spanish_restaurant"],
  seafood_restaurant:       ["seafood_restaurant","spanish_restaurant"],
  vegan_restaurant:         ["vegan_restaurant","vegetarian_restaurant"],
  vegetarian_restaurant:    ["vegetarian_restaurant","vegan_restaurant"],
  steak_house:              ["steak_house"],
  cafe:                     ["cafe","bakery","breakfast_restaurant"],
  breakfast_restaurant:     ["breakfast_restaurant","cafe","bakery"],
  fast_food_restaurant:     ["fast_food_restaurant","meal_takeaway"],
};

export const DEFAULT_WEIGHTS = { cuisine:0.40, rating:0.27, price:0.18, distance:0.15 };

export function synthesizeProfile(user) {
  const reviews  = user.reviewed_cuisines || {};
  const visits   = user.visited_types || {};
  const disliked = new Set(user.disliked || []);
  const affinity = {};

  for (const [cuisine, data] of Object.entries(reviews)) {
    if (disliked.has(cuisine)) continue;
    affinity[cuisine] = (affinity[cuisine] || 0) + data.count * 0.4 + data.avg_rating * 2 * 0.4;
  }
  for (const [cuisine, count] of Object.entries(visits)) {
    if (disliked.has(cuisine)) continue;
    affinity[cuisine] = (affinity[cuisine] || 0) + count * 0.35;
  }
  const maxVal = Math.max(...Object.values(affinity), 1);
  const normalized = Object.fromEntries(
    Object.entries(affinity).map(([k,v]) => [k, Math.round(v/maxVal*1000)/1000])
  );
  const topCuisines = Object.entries(normalized)
    .sort((a,b) => b[1]-a[1]).slice(0,5).map(([k]) => k);

  return {
    topCuisines,
    affinity: normalized,
    preferredPrice: user.preferred_price_level || 2,
    disliked: [...disliked],
    name: user.name,
  };
}

export function scoreRestaurants(restaurants, profile, { mode="all", advanced={}, weights } = {}) {
  const w = weights || { ...DEFAULT_WEIGHTS };

  // Hard filters
  let filtered = restaurants.filter(r => {
    if (advanced.price_max && (r.price_level || 2) > advanced.price_max) return false;
    const types = new Set(r.types || []);
    if (advanced.dietary === "vegan" && !types.has("vegan_restaurant") && !types.has("vegetarian_restaurant")) return false;
    if (advanced.dietary === "seafood" && !types.has("seafood_restaurant")) return false;
    if (mode === "open" && r.open_now === false) return false;
    return true;
  });
  if (filtered.length === 0) filtered = restaurants;

  return filtered.map(r => {
    const rTypes = new Set(r.types || []);

    // Cuisine score
    let cuisineScore = 0;

    if (advanced.cuisine_override?.length) {
      // User explicitly asked for a specific cuisine — score purely on that match
      const overrideSet = new Set(advanced.cuisine_override);
      const matches = [...overrideSet].some(t => rTypes.has(t));
      cuisineScore = matches ? 100 : 0;
    } else {
      for (const cuisine of profile.topCuisines) {
        const aliases = new Set(CUISINE_ALIASES[cuisine] || [cuisine]);
        const overlap = [...aliases].some(a => rTypes.has(a));
        if (overlap) cuisineScore = Math.max(cuisineScore, (profile.affinity[cuisine]||0)*100);
      }
    }
    for (const d of profile.disliked) {
      if (rTypes.has(d)) cuisineScore *= 0.3;
    }
    if (mode === "trending" && (r.reviews_count||0) > 800) cuisineScore = Math.min(100, cuisineScore*1.15);
    if (mode === "hidden"   && (r.reviews_count||0) < 200) cuisineScore = Math.min(100, cuisineScore*1.20);

    // Rating score
    const ratingScore = Math.max(0, ((r.rating||3.5) - 3.5) / 1.5 * 100);

    // Price score
    const priceScore  = Math.max(0, 100 - Math.abs((profile.preferredPrice||2) - (r.price_level||2)) * 33);

    // Distance score
    const distScore   = Math.max(0, 100 - ((r.distance_m||1000) / 2000) * 100);

    const jitter = Math.random() * 6 - 3;
    const total  = Math.min(99, Math.max(10, Math.round(
      w.cuisine*cuisineScore + w.rating*ratingScore + w.price*priceScore + w.distance*distScore + jitter
    )));

    return { ...r, matchPct: total, cuisineScore: Math.round(cuisineScore),
      ratingScore: Math.round(ratingScore), priceScore: Math.round(priceScore), distScore: Math.round(distScore) };
  })
  .sort((a,b) => b.matchPct - a.matchPct)
  .slice(0, 6);
}
