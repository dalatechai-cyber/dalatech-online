// Animated List — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/animated-list
//         (cdn.21st.dev/user_magicui/animated-list.tsx), converted to JSX.
// Changes, and why:
// - Plays ONCE and stops on the last item. The original loops with a modulo,
//   so on wrap-around it drops back to a single item — the "blank phone while
//   scrolling" the old night section was criticised for.
// - Starts only when `play` is true (the caller passes in-view), and the first
//   item is on screen from the first render, so the frame is never empty.
// - Reduced motion: every item at once, no springs.
// - Newest item on top, as in the original (a notification stack).
import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

export const AnimatedList = React.memo(function AnimatedList({ className, children, delay = 1000, play = true }) {
  const reduced = useReducedMotion();
  const items = React.Children.toArray(children);
  const count = items.length;
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduced || !play || index >= count - 1) return undefined;
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, count - 1)), delay);
    return () => clearTimeout(timer);
  }, [reduced, play, index, count, delay]);

  const shown = (reduced ? items : items.slice(0, index + 1)).slice().reverse();

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <AnimatePresence initial={false}>
        {shown.map((item) => (
          <AnimatedListItem key={item.key} reduced={reduced}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
});

export function AnimatedListItem({ children, reduced }) {
  const animations = reduced
    ? {}
    : {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1, originY: 0 },
        exit: { scale: 0, opacity: 0 },
        transition: { type: "spring", stiffness: 350, damping: 40 },
      };
  return (
    <motion.div {...animations} layout={!reduced} className="mx-auto w-full">
      {children}
    </motion.div>
  );
}
