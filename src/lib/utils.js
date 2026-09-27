import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// The class-name helper every 21st.dev / shadcn component imports: join
// conditional classes, and let a later Tailwind class win over an earlier
// conflicting one (so a caller's `className` can override a default).
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
