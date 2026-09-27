// Shimmer Button — 21st.dev @dillionverma (Magic UI).
// Source: https://21st.dev/@dillionverma/components/shimmer-button
//         (cdn.21st.dev/user_magicui/shimmer-button.tsx), converted to JSX.
// Changes: fixed the upstream `insert-0` typo (the highlight layer never got
// positioned); dropped `dark:text-black` (this site is dark only); the spark
// stands still for reduced-motion visitors. `shimmer-slide` and `spin-around`
// keyframes live in tailwind.config.js.
import React from "react";
import { cn } from "../../lib/utils";

export const ShimmerButton = React.forwardRef(function ShimmerButton(
  {
    shimmerColor = "#ffffff",
    shimmerSize = "0.05em",
    shimmerDuration = "3s",
    borderRadius = "100px",
    background = "rgba(0, 0, 0, 1)",
    className,
    children,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      type={type}
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)]",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        className
      )}
      ref={ref}
      {...props}
    >
      {/* spark container */}
      <div aria-hidden className="absolute inset-0 -z-30 overflow-visible blur-[2px] [container-type:size]">
        {/* spark */}
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none] motion-reduce:animate-none">
          {/* spark before */}
          <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0] motion-reduce:animate-none" />
        </div>
      </div>
      {children}

      {/* highlight */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 size-full",
          "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          "transform-gpu transition-all duration-300 ease-in-out",
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )}
      />

      {/* backdrop */}
      <div aria-hidden className="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]" />
    </button>
  );
});
