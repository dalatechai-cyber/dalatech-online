// Pricing Section — 21st.dev @kokonutd (Kokonut UI).
// Source: https://21st.dev/@kokonutd/components/pricing-section
//         (cdn.21st.dev/user_2rQ1QHrJyxpmWMHhqhANzWMc64n/pricing-section.tsx),
//         converted to JSX.
// Kept: the monthly / yearly pill toggle, the two-column tier cards, the
// highlighted tier with its badge, the check-listed features, one button per
// card. Changed, and why:
// - Prices are tugrik strings formatted by the caller, not `$<number>`; a tier
//   may have no price yet (Эхо), and a tier can carry fine-print lines (Нова's
//   SMS, Ора's extra messages and users) under its price.
// - Every label comes from the caller (this page is Mongolian); the section
//   heading is the caller's, so the component starts at the toggle.
// - The toggle is a real two-state control (aria-pressed), and the card
//   buttons do something (the caller's onClick) instead of being inert.
// - Colours are the site's navy / sky tokens; @radix-ui/react-icons and the
//   shadcn Button / Badge were dropped for inline SVG and plain elements.
import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

function Check({ muted }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 15 15" fill="none" className={cn("mt-[3px] shrink-0", muted ? "text-fg-dim" : "text-accent")}>
      <path d="M11.47 3.84a.75.75 0 0 1 .19 1.04l-4.5 6.5a.75.75 0 0 1-1.15.1l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.87 1.87 3.99-5.76a.75.75 0 0 1 1.04-.19Z" fill="currentColor" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M8.15 3.15a.5.5 0 0 1 .7 0l4 4a.5.5 0 0 1 0 .7l-4 4a.5.5 0 0 1-.7-.7L11.29 8H2.5a.5.5 0 0 1 0-1h8.79L8.15 3.85a.5.5 0 0 1 0-.7Z" fill="currentColor" />
    </svg>
  );
}

export function PricingSection({ tiers, labels, className, footer }) {
  const reduced = useReducedMotion();
  const [isYearly, setIsYearly] = React.useState(false);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-10 flex flex-col items-center gap-3">
        <div role="group" aria-label={labels.periodLabel} className="inline-flex items-center rounded-full border border-white/10 bg-ink-900 p-1.5">
          {[false, true].map((yearly) => (
            <button
              key={String(yearly)}
              type="button"
              aria-pressed={isYearly === yearly}
              onClick={() => setIsYearly(yearly)}
              className={cn(
                "min-h-[44px] rounded-full px-6 text-sm font-medium transition-colors duration-300 sm:px-8",
                isYearly === yearly ? "bg-fg text-ink-950" : "text-fg-muted hover:text-fg"
              )}
            >
              {yearly ? labels.yearly : labels.monthly}
            </button>
          ))}
        </div>
        <p className="text-center text-[13.5px] text-fg-muted">{labels.yearlyNote}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {tiers.map((tier) => {
          const price = tier.price ? (isYearly ? tier.price.yearly : tier.price.monthly) : null;
          return (
            <div
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-3xl border transition-colors duration-300",
                tier.className,
                tier.highlight
                  ? "border-accent/35 bg-gradient-to-b from-accent/[0.09] to-ink-900 shadow-[0_30px_80px_-40px_rgba(96,200,255,0.45)]"
                  : "border-white/[0.08] bg-ink-900"
              )}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-6">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-semibold",
                      tier.highlight ? "bg-accent text-ink-950" : "border border-white/10 bg-ink-800 text-fg-muted"
                    )}
                  >
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="flex-1 p-6 pt-8 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-[22px] font-semibold tracking-tight text-fg">{tier.name}</h3>
                    <p className="mt-0.5 text-[14px] text-fg-muted">{tier.role}</p>
                  </div>
                  {tier.icon}
                </div>

                <div className="mt-6 min-h-[64px]">
                  {price ? (
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={price}
                          initial={reduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduced ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="font-display text-[34px] font-semibold tracking-tight text-fg tabular-nums sm:text-[38px]"
                        >
                          {price}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-[14px] text-fg-muted">{isYearly ? labels.perYear : labels.perMonth}</span>
                    </div>
                  ) : (
                    <p className="font-display text-[18px] font-semibold text-fg-muted">{tier.noPrice}</p>
                  )}
                  {tier.setup && <p className="mt-1 text-[13.5px] text-fg-muted">{tier.setup}</p>}
                  {isYearly && tier.price && tier.yearlyHint && <p className="mt-1 text-[13px] text-accent">{tier.yearlyHint}</p>}
                </div>

                {tier.extras && tier.extras.length > 0 && (
                  <ul className="mt-4 space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] leading-[1.5] text-fg-muted">
                    {tier.extras.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}

                {/* `wide` lays a spanning card's features in two columns;
                    `compactOnPhone` drops the feature list below md, where the
                    page's staff tiles have already said what each one does */}
                <ul
                  className={cn(
                    "mt-6 space-y-3",
                    tier.wide && "md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-3 md:space-y-0",
                    tier.compactOnPhone && "hidden md:block"
                  )}
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-[14px] leading-[1.5] text-fg/90">
                      <Check muted={!tier.highlight} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto p-6 pt-0 sm:p-8 sm:pt-0">
                <button
                  type="button"
                  onClick={tier.cta.onClick}
                  className={cn(
                    "pressable flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
                    tier.highlight ? "bg-fg text-ink-950 hover:bg-white" : "bg-white/[0.04] text-fg ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]"
                  )}
                >
                  {tier.cta.label}
                  <Arrow />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
