// lib/users.js — Mock personas simulating Google Account data
// In production: populated from Google People API + Maps Activity API after OAuth

export const MOCK_USERS = {
  "david@gmail.com": {
    name: "David",
    email: "david@gmail.com",
    initials: "D",
    color: "#1a73e8",
    neighborhood: "Eixample",
    tagline: "Ramen hunter & natural wine devotee",
    reviewed_cuisines: {
      japanese_restaurant:      { count: 12, avg_rating: 4.6 },
      sushi_restaurant:         { count: 5,  avg_rating: 4.7 },
      bar:                      { count: 9,  avg_rating: 4.3 },
      spanish_restaurant:       { count: 10, avg_rating: 4.2 },
      italian_restaurant:       { count: 7,  avg_rating: 4.0 },
      mediterranean_restaurant: { count: 5,  avg_rating: 4.5 },
      fast_food_restaurant:     { count: 2,  avg_rating: 2.8 },
    },
    visited_types: {
      japanese_restaurant: 15, bar: 18, spanish_restaurant: 12,
      italian_restaurant: 10,  cafe: 8, fast_food_restaurant: 3,
    },
    saved_places: ["Tickets", "Bodega 1900", "Koy Shunka", "Bar Brutal", "Ramen Ya Hiro"],
    preferred_price_level: 2,
    disliked: ["fast_food_restaurant", "meal_delivery"],
  },

  "sofia@gmail.com": {
    name: "Sofia",
    email: "sofia@gmail.com",
    initials: "S",
    color: "#e8710a",
    neighborhood: "Gràcia",
    tagline: "Plant-based brunch explorer",
    reviewed_cuisines: {
      vegan_restaurant:         { count: 14, avg_rating: 4.8 },
      mediterranean_restaurant: { count: 11, avg_rating: 4.5 },
      cafe:                     { count: 8,  avg_rating: 4.4 },
      italian_restaurant:       { count: 6,  avg_rating: 4.1 },
      spanish_restaurant:       { count: 4,  avg_rating: 3.9 },
    },
    visited_types: {
      vegan_restaurant: 20, cafe: 15, mediterranean_restaurant: 12,
      italian_restaurant: 8, bakery: 7,
    },
    saved_places: ["Flax & Kale", "Teresa Carles", "Federal Café", "Honest Greens"],
    preferred_price_level: 2,
    disliked: ["fast_food_restaurant", "steak_house"],
  },

  "marc@gmail.com": {
    name: "Marc",
    email: "marc@gmail.com",
    initials: "M",
    color: "#188038",
    neighborhood: "Barceloneta",
    tagline: "Seafood purist, cava enthusiast",
    reviewed_cuisines: {
      seafood_restaurant: { count: 16, avg_rating: 4.7 },
      spanish_restaurant: { count: 13, avg_rating: 4.4 },
      steak_house:        { count: 7,  avg_rating: 4.6 },
      bar:                { count: 10, avg_rating: 4.2 },
    },
    visited_types: {
      seafood_restaurant: 22, bar: 19, spanish_restaurant: 14,
      steak_house: 9, fast_food_restaurant: 6,
    },
    saved_places: ["La Mar Salada", "El Xiringuito Escribà", "Bar Cañete", "La Cova Fumada"],
    preferred_price_level: 3,
    disliked: ["vegan_restaurant", "fast_food_restaurant"],
  },
};
