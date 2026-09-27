// TEMPORARY: /avatar-options, the founder's pick of a staff avatar style
// (2026-09-27). Not linked from anywhere and marked noindex. Delete this file
// and its route once a style is chosen and applied.
import React from "react";
import { useTranslation } from "react-i18next";
import { ATLAS, CHARS } from "./office/pixel";

const IDS = ["dali", "vira", "eho", "nova", "ora"];

// A crop is a square window on the 32×64 idle frame, in atlas pixels:
// x0/y0 its top-left corner, n its side. Tiles are drawn at a whole multiple
// of n wherever possible so every sprite pixel is the same size on screen.
const CROPS = {
  face: { x0: 4, y0: 21, n: 24 }, // hair to chin, edge to edge
  bust: { x0: 0, y0: 16, n: 32 }, // hair to shoulders
};

const TINTS = {
  dali: "rgba(56,189,248,0.28)",
  vira: "rgba(167,139,250,0.30)",
  eho: "rgba(250,204,21,0.26)",
  nova: "rgba(45,212,191,0.26)",
  ora: "rgba(203,213,225,0.26)",
};

function Sprite({ id, crop, px }) {
  const a = CHARS[id].idle;
  const k = px / crop.n;
  return (
    <span
      aria-hidden
      className="block"
      style={{
        width: px,
        height: px,
        backgroundImage: `url(${ATLAS.url})`,
        backgroundSize: `${ATLAS.w * k}px ${ATLAS.h * k}px`,
        backgroundPosition: `-${(a.x + crop.x0) * k}px -${(a.y + crop.y0) * k}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
}

// B and D: the live tile. A 36-unit square, the 32-wide frame centred in it
// (rows 16–51), on white/6% with a rounded corner.
function LiveTile({ id, size }) {
  const a = CHARS[id].idle;
  const box = 36 * size;
  return (
    <span className="flex shrink-0 items-end justify-center overflow-hidden bg-white/[0.06]" style={{ width: box, height: box, borderRadius: Math.max(5, Math.round(size * 6)) }}>
      <span
        className="block shrink-0"
        style={{
          width: a.w * size,
          height: box,
          backgroundImage: `url(${ATLAS.url})`,
          backgroundSize: `${ATLAS.w * size}px ${ATLAS.h * size}px`,
          backgroundPosition: `-${a.x * size}px -${(a.y + 16) * size}px`,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
    </span>
  );
}

// px = the tile's side at the size under test
function Avatar({ style, id, px }) {
  if (style === "A") {
    return <span className="block shrink-0 overflow-hidden" style={{ width: px, height: px }}><Sprite id={id} crop={CROPS.face} px={px} /></span>;
  }
  if (style === "B") return <LiveTile id={id} size={px / 36} />;
  if (style === "C") {
    return <span className="block shrink-0 overflow-hidden rounded-full bg-white/[0.06]" style={{ width: px, height: px }}><Sprite id={id} crop={CROPS.bust} px={px} /></span>;
  }
  if (style === "D") return <LiveTile id={id} size={px / 36} />;
  return (
    <span className="block shrink-0 overflow-hidden" style={{ width: px, height: px, borderRadius: Math.round(px / 6), background: TINTS[id] }}>
      <Sprite id={id} crop={CROPS.bust} px={px} />
    </span>
  );
}

const STYLES = [
  { key: "A", title: "Нүүр, дөрвөлжинг бүтэн дүүргэсэн", en: "Close-up face, edge to edge" },
  { key: "B", title: "Толгой, мөр (одоогийнх)", en: "Head and shoulders (current)" },
  { key: "C", title: "Дугуй, профайл зураг шиг", en: "Round, like a profile picture" },
  { key: "D", title: "/pricing-ийн аватар, жагсаалтад 2 дахин том", en: "The /pricing avatar, twice as large in the list" },
  { key: "E", title: "Толгой, мөр, ажилтан бүрийн өнгөтэй дэвсгэр", en: "Head and shoulders on a colour per staff member" },
];

// the home list and the /pricing card both show the avatar at 72px today
const LIST_PX = 72;
const CARD_PX = 72;

export default function AvatarOptions() {
  const { t } = useTranslation();
  React.useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Avatar options · DalaTech";
    return () => {
      meta.remove();
      document.title = prevTitle;
    };
  }, []);

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-10 text-fg">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-7 lg:px-10">
        <h1 className="font-display text-[30px] font-semibold tracking-tightest sm:text-[38px]">Avatar options A–E</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-fg-muted">
          Each style shows the five staff members as they would appear in the home staff list, then as they would appear on a /pricing card. Temporary page, not linked or indexed.
        </p>

        {STYLES.map((s) => {
          const listPx = s.key === "D" ? LIST_PX * 2 : LIST_PX;
          return (
            <section key={s.key} className="mt-14 border-t border-white/[0.08] pt-8">
              <div className="flex items-baseline gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-400 font-display text-[22px] font-semibold text-ink-950">{s.key}</span>
                <div>
                  <h2 className="font-display text-[22px] font-semibold tracking-tight">{s.title}</h2>
                  <p className="text-[13px] text-fg-dim">{s.en}</p>
                </div>
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-dim">Home staff list · {listPx}px</p>
              <div className="mt-2">
                {IDS.map((id) => (
                  <div key={id} className="flex items-center gap-4 border-t border-white/[0.07] py-4">
                    <Avatar style={s.key} id={id} px={listPx} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[17px] font-semibold tracking-tight sm:text-[19px]">{t(`office.agents.${id}.name`)}</span>
                      <span className="block text-[13px] text-fg-muted">{t(`office.agents.${id}.role`)}</span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-dim">/pricing card · {CARD_PX}px</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {IDS.map((id) => (
                  <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-ink-800/45 p-4">
                    <Avatar style={s.key} id={id} px={CARD_PX} />
                    <div className="min-w-0">
                      <p className="font-display text-[18px] font-semibold tracking-tight">{t(`office.agents.${id}.name`)}</p>
                      <p className="text-[12.5px] text-fg-muted">{t(`office.agents.${id}.role`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
