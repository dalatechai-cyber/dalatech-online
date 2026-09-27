// Accordion — 21st.dev @ibelick (Motion Primitives).
// Source: https://21st.dev/@ibelick/components/accordion
//         (cdn.21st.dev/user_motion_primitives/accordion.tsx), converted to JSX.
// Changes: the trigger and its panel are wired with aria-controls /
// aria-labelledby (the original set only aria-expanded); reduced-motion
// visitors get an instant open and close; value is passed through context
// instead of cloneElement-ing props into every child.
import React from "react";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

const AccordionContext = React.createContext(undefined);
const ItemContext = React.createContext(undefined);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("useAccordion must be used within an Accordion");
  return context;
}

function useItem() {
  const context = React.useContext(ItemContext);
  if (!context) throw new Error("AccordionTrigger / AccordionContent must be used within an AccordionItem");
  return context;
}

export function Accordion({ children, className, transition, variants, expandedValue: external, onValueChange }) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = React.useState(null);
  const baseId = React.useId();
  const expandedValue = external !== undefined ? external : internal;

  const toggleItem = React.useCallback(
    (value) => {
      const next = expandedValue === value ? null : value;
      if (onValueChange) onValueChange(next);
      else setInternal(next);
    },
    [expandedValue, onValueChange]
  );

  const ctx = React.useMemo(
    () => ({ expandedValue, toggleItem, variants, baseId }),
    [expandedValue, toggleItem, variants, baseId]
  );

  return (
    <MotionConfig transition={reduced ? { duration: 0 } : transition}>
      <div className={cn("relative", className)}>
        <AccordionContext.Provider value={ctx}>{children}</AccordionContext.Provider>
      </div>
    </MotionConfig>
  );
}

export function AccordionItem({ value, children, className }) {
  const { expandedValue, baseId } = useAccordion();
  const expanded = value === expandedValue;
  const ids = React.useMemo(() => {
    const key = String(value).replace(/[^a-zA-Z0-9_-]/g, "");
    return { trigger: `${baseId}-t-${key}`, panel: `${baseId}-p-${key}` };
  }, [baseId, value]);
  const item = React.useMemo(() => ({ value, expanded, ids }), [value, expanded, ids]);
  return (
    <div className={cn("overflow-hidden", className)} {...(expanded ? { "data-expanded": "" } : {})}>
      <ItemContext.Provider value={item}>{children}</ItemContext.Provider>
    </div>
  );
}

export function AccordionTrigger({ children, className }) {
  const { toggleItem } = useAccordion();
  const { value, expanded, ids } = useItem();
  return (
    <button
      id={ids.trigger}
      onClick={() => toggleItem(value)}
      aria-expanded={expanded}
      aria-controls={ids.panel}
      type="button"
      className={cn("group", className)}
      {...(expanded ? { "data-expanded": "" } : {})}
    >
      {children}
    </button>
  );
}

const BASE_VARIANTS = {
  expanded: { height: "auto", opacity: 1 },
  collapsed: { height: 0, opacity: 0 },
};

export function AccordionContent({ children, className }) {
  const { variants } = useAccordion();
  const { expanded, ids } = useItem();
  const combined = {
    expanded: { ...BASE_VARIANTS.expanded, ...variants?.expanded },
    collapsed: { ...BASE_VARIANTS.collapsed, ...variants?.collapsed },
  };
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          id={ids.panel}
          role="region"
          aria-labelledby={ids.trigger}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
          variants={combined}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
