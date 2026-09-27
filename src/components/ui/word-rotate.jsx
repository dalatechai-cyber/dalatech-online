// Word Rotate — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/word-rotate
//         (cdn.21st.dev/user_magicui/word-rotate.tsx), converted to JSX.
// Changes: renders an inline <span> instead of an <h1>, so it can sit inside
// the page's one heading; the rotation stops while the tab is hidden; under
// reduced motion it does not rotate at all and shows `staticText` (every word
// at once) instead, so nothing is hidden from a visitor who opted out.
import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

const DEFAULT_FRAMER = {
  initial: { opacity: 0, y: "-0.6em" },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: "0.6em" },
  transition: { duration: 0.25, ease: "easeOut" },
};

export function WordRotate({ words, duration = 2500, framerProps = DEFAULT_FRAMER, className, staticText }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduced || words.length < 2) return undefined;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setIndex((prev) => (prev + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration, reduced]);

  if (reduced) return <span className={cn(className)}>{staticText ?? words[0]}</span>;

  return (
    <span className="inline-flex overflow-hidden py-[0.08em] align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={words[index]} className={cn("inline-block", className)} {...framerProps}>
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
