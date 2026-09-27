// Sentences that name who is live and who is coming soon, composed from the locale.
//
// Every sentence here is a locale string; this file only chooses which ones apply to the
// current launch states (src/office/launch.js) and joins the staff names into them. With
// only Дали live, each function returns exactly the text the page showed before the
// switches existed, so the pre-registration state reads as it always has.
//
// `t` is i18next's; `live` is { dali, vira, eho, nova, ora: boolean }.

const ROOM = ["vira", "eho", "nova"]; // the customer-facing three besides Дали
const OTHERS = ["vira", "eho", "nova", "ora"];

// «Вира, Эхо, Нова» in Mongolian; «Vira, Eho and Nova» in English (`staffText.lastSep`).
const names = (t, ids) => {
  const list = ids.map((id) => t(`office.agents.${id}.name`));
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")}${t("staffText.lastSep")}${list[list.length - 1]}`;
};
const upperFirst = (s) => (s ? s.charAt(0).toLocaleUpperCase("mn-MN") + s.slice(1) : s);
const sentences = (...parts) => parts.filter(Boolean).join(" ");
const split = (live, ids) => ({ on: ids.filter((id) => live[id]), off: ids.filter((id) => !live[id]) });

/** Landing hero, under the headline. */
export function heroDescription(t, live) {
  const { on, off } = split(live, OTHERS);
  return sentences(
    t("staffText.hero.lead"),
    on.length ? t("staffText.hero.live", { names: names(t, on) }) : "",
    off.length ? t("staffText.hero.soon", { names: names(t, off) }) : "",
  );
}

/** The working-day section's lead. */
export function dayLead(t, live) {
  const { on, off } = split(live, ROOM);
  return sentences(
    t("staffText.day.lead"),
    on.length ? t("staffText.day.live", { names: names(t, on) }) : "",
    off.length ? t("staffText.day.soon", { names: names(t, off) }) : "",
  );
}

/** The working-day room's description for screen readers. */
export function daySceneAlt(t, live) {
  const { on, off } = split(live, ROOM);
  if (on.length === 0) return t("day.sceneAlt");
  return sentences(
    t("staffText.day.altRoom"),
    t("staffText.day.altLive", { names: names(t, ["dali", ...on]) }),
    off.length ? t("staffText.day.altSoon", { names: names(t, off) }) : "",
  );
}

/** «Өнөөдөр Дали. Удахгүй бүтэн баг.» and what it becomes. */
export function theFourTitle(t, live) {
  const { on, off } = split(live, OTHERS);
  if (on.length === 0) return t("theFour.title");
  if (off.length === 0) return t("staffText.theFour.titleAll");
  return t("staffText.theFour.titleSome", { names: names(t, ["dali", ...on]) });
}

export function theFourLead(t, live) {
  const { on, off } = split(live, OTHERS);
  if (on.length === 0) return t("theFour.lead");
  const clauses = (ids) => ids.map((id) => t(`staffText.theFour.clause.${id}`)).join(", ");
  const onRoom = on.filter((id) => id !== "ora");
  const offRoom = off.filter((id) => id !== "ora");
  return sentences(
    t("staffText.theFour.dali"),
    onRoom.length ? t("staffText.theFour.live", { clauses: upperFirst(clauses(onRoom)) }) : "",
    offRoom.length ? t("staffText.theFour.soon", { clauses: clauses(offRoom) }) : "",
    t(live.ora ? "staffText.theFour.oraLive" : "staffText.theFour.oraSoon"),
  );
}

/** /office opening. */
export function officeTitle(t, live) {
  const { on, off } = split(live, OTHERS);
  if (on.length === 0) return t("office.hero.title");
  if (off.length === 0) return t("staffText.office.titleAll");
  return t("staffText.office.titleSome", { live: names(t, ["dali", ...on]), soon: names(t, off) });
}

export function officeLead(t, live) {
  const { on } = split(live, OTHERS);
  if (on.length === 0) return t("office.hero.lead");
  // The order the lead has always used: messages, calls, content, reminders, the owner.
  const order = ["dali", "eho", "vira", "nova", "ora"];
  return sentences(
    t("staffText.office.intro"),
    ...order.map((id) => t(`staffText.office.${live[id] ? "live" : "soon"}.${id}`)),
  );
}

/** The shift board's caption. */
export function boardCaption(t, live) {
  const { on, off } = split(live, OTHERS);
  if (on.length === 0) return t("office.board.caption");
  return sentences(
    t("staffText.board.base"),
    off.length ? t("staffText.board.some", { live: names(t, ["dali", ...on]), soon: names(t, off) }) : "",
  );
}

/** Between the four chapters and Ора's. Only Дали live reads as it always has. */
export function oraIntroLead(t, live) {
  const { on, off } = split(live, ["dali", ...ROOM]);
  return sentences(
    off.length
      ? t("staffText.oraIntro.some", { live: names(t, on), soon: names(t, off) })
      : t("staffText.oraIntro.all", { names: names(t, on) }),
    t(live.ora ? "staffText.oraIntro.oraLive" : "staffText.oraIntro.oraSoon"),
  );
}

/** The team builder's note, for the picked staff who are not live yet. */
export function teamSoonNote(t, soonIds) {
  return t("staffText.team.soon", { names: names(t, soonIds) });
}

/** /pricing, beside Ора's card. */
export function ownerDescription(t, live) {
  const { on, off } = split(live, OTHERS);
  if (on.length === 0) return t("pricing.staff.ownerDescription");
  const offRoom = off.filter((id) => id !== "ora");
  return sentences(
    offRoom.length ? t("staffText.owner.soon", { names: names(t, offRoom) }) : "",
    t(live.ora ? "staffText.owner.oraLive" : "staffText.owner.oraSoon"),
  );
}
