// Blur Fade — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/blur-fade
//         (cdn.21st.dev/user_magicui/blur-fade.tsx), converted to JSX.
// Changes: reduced-motion visitors get the content with no fade at all; the
// `as` prop lets a block be a <li> or <section>; the visible state rests at
// y 0 (upstream rests at -yOffset, which left a visible seam under blocks
// laid out on a hairline-gap grid).
import React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  as = "div",
  ...rest
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const Tag = motion[as] ?? motion.div;

  if (reduced) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const defaultVariants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };
  return (
    <AnimatePresence>
      <Tag
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={variant || defaultVariants}
        transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }}
        className={className}
        {...rest}
      >
        {children}
      </Tag>
    </AnimatePresence>
  );
}
