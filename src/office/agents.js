// Commercial facts about the five AI staff on /office. Names, roles and job
// descriptions live in the locale files; this is only what does not translate.

// Prices in tugrik. Вира is only sold alongside another agent. Ора works for
// the owner rather than their customers; commercially she is one more member
// of staff, so she takes part in the team discount like the others.
export const AGENTS = {
  dali: { setup: 150000, monthly: 250000 },
  nova: { setup: 150000, monthly: 150000 },
  vira: { setup: 150000, monthly: 150000, addOnOnly: true },
  eho: { setup: 200000, monthly: 250000, perMinute: true },
  ora: { setup: 150000, monthly: 250000 },
};

// The deepest tier is "four or more": no separate five-agent rate has been
// announced, and a team of five with no discount at all would be a bug.
export const BUNDLES = [
  { agents: 2, discount: 0.1 },
  { agents: 3, discount: 0.15 },
  { agents: 4, discount: 0.2 },
  { agents: 5, discount: 0.2 },
];

export function formatTugrik(n) {
  return "₮" + n.toLocaleString("en-US");
}
