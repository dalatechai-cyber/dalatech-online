// Number Ticker — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/number-ticker
//         (cdn.21st.dev/user_magicui/number-ticker.tsx), converted to JSX.
// Changes: the span renders its starting number from the first paint instead
// of being empty until the spring runs (an empty span read as a missing number
// to a screen reader, and before the section scrolled in); reduced-motion
// visitors get the final number straight away; the start timer is cleared on
// unmount; dropped the black/white text colours (the caller sets the colour).
import React from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "../../lib/utils";

const format = (n, decimalPlaces) =>
  Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(n.toFixed(decimalPlaces)));

export function NumberTicker({ value, direction = "up", delay = 0, className, decimalPlaces = 0 }) {
  const reduced = useReducedMotion();
  const ref = React.useRef(null);
  const start = direction === "down" ? value : 0;
  const end = direction === "down" ? 0 : value;
  const motionValue = useMotionValue(start);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  React.useEffect(() => {
    if (reduced || !isInView) return undefined;
    const timer = setTimeout(() => motionValue.set(end), delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, isInView, delay, end, reduced]);

  React.useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest, decimalPlaces);
      }),
    [springValue, decimalPlaces]
  );

  return (
    <span className={cn("inline-block tabular-nums tracking-wider", className)} ref={ref}>
      {format(reduced ? end : start, decimalPlaces)}
    </span>
  );
}
