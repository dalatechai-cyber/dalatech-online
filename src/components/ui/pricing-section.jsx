// Monthly / yearly toggle — from 21st.dev @kokonutd (Kokonut UI) "Pricing
// Section": https://21st.dev/@kokonutd/components/pricing-section
// (cdn.21st.dev/user_2rQ1QHrJyxpmWMHhqhANzWMc64n/pricing-section.tsx).
// Only the pill toggle is kept; the pricing page keeps the live site's own
// cards. Changes: a real two-state control (aria-pressed), labels from the
// caller, the site's navy / light tokens instead of zinc, 44px touch targets.
import { cn } from "../../lib/utils";

export function PeriodToggle({ yearly, onChange, labels, className }) {
  return (
    <div role="group" aria-label={labels.group} className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1", className)}>
      {[false, true].map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={yearly === option}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-[44px] rounded-full px-6 text-[14px] font-semibold tracking-tight transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
            yearly === option ? "bg-fg text-ink-950" : "text-fg-muted hover:text-fg"
          )}
        >
          {option ? labels.yearly : labels.monthly}
        </button>
      ))}
    </div>
  );
}
