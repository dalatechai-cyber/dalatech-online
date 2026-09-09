// Commercial facts about the four AI staff on /office. Names, roles and job
// descriptions live in the locale files; this is only what does not translate.

// Prices in tugrik. Веда is only sold alongside another agent.
export const AGENTS = {
  ara: { setup: 150000, monthly: 250000 },
  nova: { setup: 150000, monthly: 250000 },
  veda: { setup: 150000, monthly: 150000, addOnOnly: true },
  eho: { setup: 200000, monthly: 250000, perMinute: true },
};

export const BUNDLES = [
  { agents: 2, discount: 0.1 },
  { agents: 3, discount: 0.15 },
  { agents: 4, discount: 0.2 },
];

export function formatTugrik(n) {
  return "₮" + n.toLocaleString("en-US");
}
