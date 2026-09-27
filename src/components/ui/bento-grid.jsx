// Bento Grid — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/bento-grid
//         (cdn.21st.dev/user_magicui/bento-grid.tsx), converted to JSX.
// Changes: the card takes children instead of fixed name/Icon/description/cta
// props, because each staff tile carries a pixel avatar, a status and a price
// the original card has no slot for. Dropped @radix-ui/react-icons and the
// shadcn Button (one arrow icon and one button were not worth two packages).
// Colours are the site's ink tokens; the hover lift stays, off for reduced motion.
import { cn } from "../../lib/utils";

export const BentoGrid = ({ children, className }) => (
  <div className={cn("grid w-full grid-cols-1 gap-4 md:grid-cols-3", className)}>{children}</div>
);

export const BentoCard = ({ className, children, as: Tag = "div", ...rest }) => (
  <Tag
    className={cn(
      "group relative flex flex-col overflow-hidden rounded-2xl",
      "transform-gpu border border-white/[0.08] bg-ink-900 [box-shadow:0_-20px_80px_-20px_#ffffff0d_inset]",
      "transition-[transform,border-color] duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:border-white/[0.14]",
      className
    )}
    {...rest}
  >
    {children}
  </Tag>
);
