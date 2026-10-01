// Commercial facts about the five AI staff. Names, roles and job descriptions
// live in the locale files; this is only what does not translate.
//
// Prices in tugrik, exactly as Дали quotes them (dalatech-chatbot,
// dalatech-messenger/lib/facts.js, founder-approved 2026-09-27; Вира 250,000₮
// from 2026-10-01): setup is
// 50,000₮ for every staff member. Эхо's price has not been announced, so both
// of its amounts are null and every screen that shows a price says so instead.
// Ора works for the owner rather than their customers; commercially she is one
// more member of staff, so she takes part in the team discount like the others.
export const AGENTS = {
  dali: { setup: 50000, monthly: 250000 },
  nova: { setup: 50000, monthly: 150000 },
  vira: { setup: 50000, monthly: 250000 },
  eho: { setup: null, monthly: null },
  ora: { setup: 50000, monthly: 250000 },
};

// The deepest tier is "four or more": no separate five-agent rate has been
// announced, and a team of five with no discount at all would be a bug.
export const BUNDLES = [
  { agents: 2, discount: 0.1 },
  { agents: 3, discount: 0.15 },
  { agents: 4, discount: 0.2 },
  { agents: 5, discount: 0.2 },
];

// "250,000₮": the way Дали and the price list write an amount.
export function formatTugrik(n) {
  return n.toLocaleString("en-US") + "₮";
}
