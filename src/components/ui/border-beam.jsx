// Border Beam — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/border-beam
//         (cdn.21st.dev/user_magicui/border-beam.tsx), converted to JSX.
// Changes: hidden for reduced-motion visitors (it is pure decoration); the
// `animate-border-beam` keyframe lives in tailwind.config.js.
import { cn } from "../../lib/utils";

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}) => (
  <div
    aria-hidden
    style={{
      "--size": size,
      "--duration": duration,
      "--anchor": anchor,
      "--border-width": borderWidth,
      "--color-from": colorFrom,
      "--color-to": colorTo,
      "--delay": `-${delay}s`,
    }}
    className={cn(
      "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] motion-reduce:hidden",
      // mask styles
      "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
      // pseudo styles
      "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
      className
    )}
  />
);
