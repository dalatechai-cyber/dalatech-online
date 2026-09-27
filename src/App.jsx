import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate,
  useNavigationType,
  Navigate,
} from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useMotionValue,
  useReducedMotion,
  useInView,
} from "framer-motion";

import { AGENTS as OFFICE_AGENTS, BUNDLES as OFFICE_BUNDLES, formatTugrik } from "./office/agents";
import { loadAtlas as loadStaffAtlas, createStage as createPixelStage, setStagesFrozen, stageDpr, ATLAS as STAFF_ATLAS, CHARS as STAFF_CHARS } from "./office/pixel";
import { drawChapter as drawStaffChapter, drawOraRoom, STAFF as STAFF_ORDER } from "./office/scenes";

import { Spotlight } from "./components/ui/spotlight";
import { WordRotate } from "./components/ui/word-rotate";
import { AnimatedBeam } from "./components/ui/animated-beam";
import { AnimatedList } from "./components/ui/animated-list";
import { BentoGrid, BentoCard } from "./components/ui/bento-grid";
import { BorderBeam } from "./components/ui/border-beam";
import { PricingSection } from "./components/ui/pricing-section";
import { ShimmerButton } from "./components/ui/shimmer-button";
import { NumberTicker } from "./components/ui/number-ticker";
import { Safari } from "./components/ui/safari";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
import { BlurFade } from "./components/ui/blur-fade";

const Setup = React.lazy(() => import("./Setup"));
const Globe = React.lazy(() => import("./Globe"));

const EASE_OUT = [0.16, 1, 0.3, 1];
const SPRING_REVEAL = { type: "spring", stiffness: 110, damping: 22, mass: 0.6 };
const SPRING_HEADLINE = { type: "spring", stiffness: 140, damping: 18, mass: 0.55 };

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    if (typeof console !== "undefined") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function Reveal({ children, delay = 0, y = 28, className = "", once = true, amount = 0.2 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ ...SPRING_REVEAL, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerGroup({ children, className = "", stagger = 0.07, delay = 0, amount = 0.2 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

// A conversation arrives on its own clock. The room overlays used to be driven
// by their section's scroll progress, which tied the pace of a chat to how
// fast the page happened to be moving under it: flick past and four messages
// landed in one frame, creep and they hung half-risen with the reply already
// showing. These run on time instead, once, from when the panel comes into
// view — a message lands, a beat passes, the answer lands.
//
// The pacing is a timer rather than framer's `staggerChildren`: driving the
// group with variant labels left every child at its resting style and
// produced no stagger at all, and a mechanism whose failure looks exactly
// like success — all four messages present — is not one to build on. Here
// what has arrived is a number this component owns, which a test can read.
const CUE_STEP = 850; // ms between arrivals
const CUE_LEAD = 250; // and before the first
const CUE_RISE = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
// Reduced motion keeps the whole exchange, it just does not perform it: empty
// variants leave each item at its resting style, which is visible.
const CUE_STILL = { hidden: {}, show: {} };
// A bar does not rise into place, it grows out of its own baseline.
const BAR_GROW = { hidden: { scaleY: 0, opacity: 0.55 }, show: { scaleY: 1, opacity: 1 } };

function useCue(ref, count, step = CUE_STEP, lead = CUE_LEAD) {
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    if (reduced || !inView) return undefined;
    // One timer per arrival, all cleared together: a single interval left a
    // stray tick running after the panel unmounted on a route change.
    //
    // Monotonic, because this effect re-runs whenever the item count changes —
    // which a language switch does the moment one locale carries a message the
    // other does not. Assigning the index outright would drop a panel the
    // visitor had already read back to one bubble and replay it at them.
    const timers = [];
    for (let i = 1; i <= count; i++) {
      timers.push(setTimeout(() => setShown((prev) => Math.max(prev, i)), lead + (i - 1) * step));
    }
    return () => timers.forEach(clearTimeout);
  }, [inView, count, step, lead, reduced]);
  return reduced ? count : shown;
}

function CueGroup({ as = "div", className = "", step, lead, children, ...rest }) {
  const ref = React.useRef(null);
  const kids = React.Children.toArray(children);
  const shown = useCue(ref, kids.length, step, lead);
  const M = motion[as];
  return (
    <M ref={ref} className={className} data-cue-shown={shown} {...rest}>
      {/* Only a CueItem is handed the flag. Anything else in the list — a date
          divider, a spacer — would take `cueShown` down to the DOM as a stray
          attribute and warn about it in development. */}
      {kids.map((c, i) => (React.isValidElement(c) && c.type === CueItem ? React.cloneElement(c, { cueShown: i < shown }) : c))}
    </M>
  );
}

function CueItem({ as = "div", className = "", variants, style, cueShown = false, children }) {
  const reduced = useReducedMotion();
  const M = motion[as];
  const v = reduced ? CUE_STILL : variants ?? CUE_RISE;
  return (
    <M
      className={className}
      style={style}
      variants={v}
      initial="hidden"
      animate={cueShown ? "show" : "hidden"}
      transition={SPRING_REVEAL}
    >
      {children}
    </M>
  );
}

function StaggerItem({ children, className = "", y = 24 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 1 } : { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: SPRING_REVEAL },
      }}
    >
      {children}
    </motion.div>
  );
}

function useContactJump() {
  const location = useLocation();
  const navigate = useNavigate();
  return React.useCallback(() => {
    if (location.pathname === "/") {
      const el = document.getElementById("contact");
      if (el) {
        const headerH = window.scrollY > 60 ? 56 : 80;
        const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollTo: "contact" } });
    }
  }, [location.pathname, navigate]);
}

function MagneticButton({
  children,
  href = "#",
  variant = "primary",
  onClick,
  type = "button",
  className = "",
  disabled = false,
  demoServices,
}) {
  const reduced = useReducedMotion();
  const jumpToContact = useContactJump();
  const { open: openDemoRequest } = useDemoRequest();
  const ref = React.useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.5 });

  // Two centralised sentinels: href="#demo" opens the demo request dialog,
  // href="#contact" routes home and scrolls to the contact section.
  const resolvedOnClick =
    onClick ||
    (href === "#demo" ? () => openDemoRequest(demoServices) : undefined) ||
    (href === "#contact" ? jumpToContact : undefined);

  const onMove = (e) => {
    if (reduced || !ref.current || disabled) return;
    // A pointermove also fires while a finger drags across the button, which
    // made the label slide under the thumb on a phone. Restrict to a real
    // pointer, and keep the pull small enough to read as weight, not as a toy.
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const r = ref.current.getBoundingClientRect();
    const clamp = (v) => Math.max(-10, Math.min(10, v));
    x.set(clamp((e.clientX - (r.left + r.width / 2)) * 0.12));
    y.set(clamp((e.clientY - (r.top + r.height / 2)) * 0.12));
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const base =
    "pressable group relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold tracking-tight transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

  const styles =
    variant === "primary"
      ? "bg-fg text-ink-950 hover:bg-white"
      : "bg-white/[0.03] text-fg ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] hover:ring-white/20";

  const Inner = (
    <motion.span
      ref={ref}
      style={{ x: sx, y: sy }}
      className={[base, styles, disabled ? "opacity-60 cursor-not-allowed" : "", className].join(" ")}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.span>
  );

  const outerClass = ["inline-block", className].join(" ").trim();

  if (resolvedOnClick || type === "submit") {
    return (
      <motion.button
        type={type}
        onClick={resolvedOnClick}
        disabled={disabled}
        className={outerClass}
        whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      >
        {Inner}
      </motion.button>
    );
  }

  const isInternalRoute =
    typeof href === "string" &&
    href.startsWith("/") &&
    !href.startsWith("//");

  if (isInternalRoute) {
    return (
      <motion.span className={outerClass} whileTap={reduced ? undefined : { scale: 0.97 }}>
        <Link to={href} className="contents">
          {Inner}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.a
      href={href}
      className={outerClass}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {Inner}
    </motion.a>
  );
}

function Container({ children, className = "" }) {
  return (
    <div className={["mx-auto w-full max-w-[1180px] px-5 sm:px-7 lg:px-10", className].join(" ")}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">
      <span className="h-px w-6 bg-white/15" />
      {children}
    </span>
  );
}

function Pill({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-fg-muted">
      {children}
    </span>
  );
}

function CheckIcon({ className = "" }) {
  return (
    <span
      aria-hidden
      className={["mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/12 ring-1 ring-inset ring-sky-400/30", className].join(" ")}
    >
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5 L5 9 L10 3.5" />
      </svg>
    </span>
  );
}

function BrandLockup({ size = 40 }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="block overflow-hidden"
        style={{ height: size, width: size, borderRadius: 8 }}
      >
        <img
          src="/dalatech_logo_v3.jpg"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          loading="eager"
          decoding="sync"
          fetchpriority="high"
          style={{ height: "100%", width: "100%", transform: "scale(1.18)" }}
          className="block object-cover"
        />
      </span>
      <span
        className="font-display text-[18px] font-bold text-fg"
        style={{ letterSpacing: "-0.02em", color: "#F0F4FF", fontWeight: 700 }}
      >
        DalaTech
      </span>
    </span>
  );
}

const LANGUAGES = [
  { code: "mn", label: "Монгол" },
  { code: "en", label: "English" },
];

// Buying decisions in the bar itself: the two things we sell, the price of
// both, and the questions. The website entry lands on its own page, not on a
// block inside pricing, so no two entries share a destination.
const NAV_ITEMS = [
  { to: "/office", labelKey: "staff" },
  { to: "/portfolio", labelKey: "website" },
  // Prices and questions are sections of the homepage now; /pricing and /faq
  // still resolve (old links) and render the same sections.
  { to: "/", labelKey: "pricing", state: { scrollTo: "pricing" } },
  { to: "/", labelKey: "faq", state: { scrollTo: "faq" } },
];

// The trust pages were reachable only from the footer, which is most of the
// way down a very long page. They get a menu instead: one more bar item, four
// more destinations, and the bar still fits a laptop.
const COMPANY_ITEMS = [
  { to: "/process", labelKey: "process" },
  { to: "/location", labelKey: "location" },
];

let bodyScrollLockCount = 0;
let bodyScrollPrevOverflow = "";
function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    // html owns the viewport scroll: index.css sets overflow-x on html, so its
    // overflow-y computes to auto and body's overflow never propagated up.
    // Locking body therefore did not stop the page scrolling — it only turned
    // body into a scroll container, which re-resolved the sticky scrollport
    // inside it and relaid out the whole document, once on open and again on
    // close, the second one landing on the first frame of the exit animation.
    bodyScrollPrevOverflow = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = "hidden";
  }
  bodyScrollLockCount += 1;
}
function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) {
    document.documentElement.style.overflowY = bodyScrollPrevOverflow;
  }
}

function CompanyMenu({ navLabel }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const location = useLocation();
  const isActive = COMPANY_ITEMS.some((i) => i.to === location.pathname);

  // Close on a click anywhere else and on Escape; without both, a menu opened
  // by keyboard can be left hanging over the page with no way back.
  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={[
          "relative inline-flex items-center gap-1 whitespace-nowrap text-[13.5px] font-medium tracking-[-0.005em] transition-colors duration-200",
          isActive || open ? "text-fg" : "text-fg-muted hover:text-fg",
        ].join(" ")}
      >
        {t("nav.company")}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
             style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease-out" }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
        {isActive && (
          <motion.span
            layoutId="nav-active-underline"
            className="absolute -bottom-1.5 left-0 right-0 h-px bg-sky-400/70"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="absolute right-0 top-[calc(100%+14px)] z-50 min-w-[190px] rounded-xl border border-white/[0.09] bg-ink-900/95 p-1.5 shadow-[0_28px_60px_-24px_rgba(3,6,16,0.95)] backdrop-blur"
          >
            {COMPANY_ITEMS.map((i) => (
              <Link
                key={i.labelKey}
                to={i.to}
                className="block rounded-lg px-3 py-2.5 text-[13.5px] text-fg/85 transition-colors hover:bg-white/[0.06] hover:text-fg"
              >
                {navLabel(i.labelKey)}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const langTimer = React.useRef(null);

  const clearTimer = () => {
    if (langTimer.current) { clearTimeout(langTimer.current); langTimer.current = null; }
  };
  const openLang = () => { clearTimer(); setLangOpen(true); };
  const scheduleClose = () => { clearTimer(); langTimer.current = setTimeout(() => setLangOpen(false), 180); };

  const changeLanguage = (code) => {
    clearTimer();
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
    setLangOpen(false);
  };

  React.useEffect(() => () => {
    clearTimer();
  }, []);

  // Close mobile menu on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    lockBodyScroll();
    document.documentElement.classList.add("nav-menu-open");
    return () => {
      unlockBodyScroll();
      document.documentElement.classList.remove("nav-menu-open");
    };
  }, [mobileOpen]);

  const navLabel = (labelKey) => t(`nav.${labelKey}`);

  return (
    <motion.header
      initial={isMobile ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={isMobile ? { duration: 0 } : { ...SPRING_REVEAL, delay: 0.05 }}
      style={
        scrolled
          ? {
              backgroundColor: "rgba(5,10,24,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }
          : {
              backgroundColor: "transparent",
              borderBottom: "1px solid transparent",
            }
      }
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-300"
    >
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-10">
        <div className={["flex items-center justify-between md:transition-all md:duration-300", scrolled ? "h-14" : "h-20"].join(" ")}>
          <Link to="/" className="flex min-h-[44px] shrink-0 items-center" data-cursor="hover" aria-label="DalaTech home">
            <BrandLockup size={40} />
          </Link>

          {/* justify-evenly, not justify-center: the nav is a flex-1 track
              running from the logo's edge to the controls', and the controls
              are 86px wider than the logo, so centring inside that track put
              the links 43px left of the bar's centre at every width and
              pooled the surplus into two voids. Evenly spread, the gap from
              the logo to the first link, between the links, and from the last
              link to the language button are all the same. No mx- or gap- here:
              either would be added on top of the distributed space. */}
          <nav className="hidden min-w-0 flex-1 items-center justify-evenly lg:flex">
            {NAV_ITEMS.map(({ to, labelKey, state }) => (
              <RouterNavLink
                key={labelKey}
                to={to}
                state={state}
                data-cursor="hover"
                className={({ isActive }) =>
                  [
                    "relative whitespace-nowrap text-[13.5px] font-medium tracking-[-0.005em] transition-colors duration-200",
                    isActive && !state ? "text-fg" : "text-fg-muted hover:text-fg",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <span className="relative inline-block">
                    {navLabel(labelKey)}
                    {isActive && !state && (
                      <motion.span
                        layoutId="nav-active-underline"
                        className="absolute -bottom-1.5 left-0 right-0 h-px bg-sky-400/70"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </span>
                )}
              </RouterNavLink>
            ))}
            <CompanyMenu navLabel={navLabel} />
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="relative hidden sm:block" onMouseEnter={openLang} onMouseLeave={scheduleClose}>
              <button
                onClick={() => { clearTimer(); setLangOpen((o) => !o); }}
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-fg-muted transition-colors hover:border-white/20 hover:text-fg"
                aria-label="Select language"
                data-cursor="hover"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    style={{ transformOrigin: "top right" }}
                    className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-800/95 py-1 shadow-2xl backdrop-blur"
                    onMouseEnter={openLang}
                    onMouseLeave={scheduleClose}
                  >
                    {LANGUAGES.map(({ code, label }) => (
                      <button
                        key={code}
                        onClick={() => changeLanguage(code)}
                        className={[
                          "flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]",
                          i18n.language === code ? "text-fg" : "text-fg-muted",
                        ].join(" ")}
                      >
                        {i18n.language === code && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                        <span className={i18n.language === code ? "" : "ml-3.5"}>{label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-fg lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
              </svg>
            </button>

            <div className="hidden md:block">
              <MagneticButton href="#demo" variant="primary">
                {t("nav.requestDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="fixed inset-0 flex flex-col lg:hidden"
            style={{ backgroundColor: "#050A18", zIndex: 2147483647 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 sm:px-7">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center"
                aria-label="DalaTech home"
              >
                <BrandLockup size={40} />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-fg"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <motion.nav
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
              }}
              className="flex flex-1 flex-col justify-center gap-2 px-5 sm:px-7"
            >
              {NAV_ITEMS.map(({ to, labelKey, state }) => {
                const isActive = location.pathname === to && !state;
                return (
                  <motion.div
                    key={labelKey}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      show: { opacity: 1, y: 0, transition: SPRING_REVEAL },
                    }}
                  >
                    <Link
                      to={to}
                      state={state}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "block py-1 font-display font-semibold tracking-tight transition-colors",
                        isActive ? "text-[#38BDF8]" : "text-fg hover:text-[#38BDF8]",
                      ].join(" ")}
                      style={{ fontSize: "40px", lineHeight: 1.08, letterSpacing: "-0.02em" }}
                    >
                      {navLabel(labelKey)}
                    </Link>
                  </motion.div>
                );
              })}

              {/* the trust pages, at a size that does not compete with the
                  five buying decisions above and still fits one screen */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: SPRING_REVEAL } }}
                className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.08] pt-6"
              >
                {COMPANY_ITEMS.map(({ to, labelKey }) => (
                  <Link
                    key={labelKey}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "py-1 text-[16px] font-medium transition-colors",
                      location.pathname === to ? "text-[#38BDF8]" : "text-fg-muted hover:text-fg",
                    ].join(" ")}
                  >
                    {navLabel(labelKey)}
                  </Link>
                ))}
              </motion.div>
            </motion.nav>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.4, ...SPRING_REVEAL } }}
              className="px-5 pb-8 sm:px-7"
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {LANGUAGES.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => changeLanguage(code)}
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium",
                      i18n.language === code
                        ? "border-[#38BDF8]/50 bg-[#38BDF8]/10 text-[#38BDF8]"
                        : "border-white/10 text-fg-muted",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <MagneticButton href="#demo" variant="primary">
                {t("nav.requestDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </motion.header>
  );
}

function BrowserMockup({ url, children, className = "" }) {
  return (
    <div className={["group relative overflow-hidden rounded-[20px] border border-white/10 bg-ink-800/70 shadow-[0_30px_80px_-30px_rgba(8,12,28,0.85)] backdrop-blur-sm", className].join(" ")}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[20px] bg-gradient-to-br from-sky-400/18 via-transparent to-brand-500/12"
        style={{ WebkitMask: "linear-gradient(black, transparent 70%)", mask: "linear-gradient(black, transparent 70%)" }}
      />
      <div className="relative flex items-center gap-2 border-b border-white/[0.06] bg-ink-900/85 px-3.5 py-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="ml-3 flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] tracking-tight text-fg-muted">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="truncate">{url}</span>
        </div>
        <div className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-muted/70 sm:flex">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </div>
      </div>
      <div className="relative aspect-[16/10]">
        {children}
      </div>
    </div>
  );
}

function SalonPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 75% 0%, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0) 55%), radial-gradient(90% 70% at 10% 110%, rgba(20,118,90,0.30) 0%, rgba(20,118,90,0) 60%), linear-gradient(180deg, #0E1A1F 0%, #0A1418 60%, #07101A 100%)",
        }}
      />
      <div className="relative flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400/15 ring-1 ring-emerald-400/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(110,231,183)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3c-3.5 4-7 7-7 11a7 7 0 0 0 14 0c0-4-3.5-7-7-11z" />
              <path d="M12 11v8" />
            </svg>
          </div>
          <span className="font-display text-[11.5px] font-semibold tracking-tight text-white sm:text-[13px]">Салон</span>
        </div>
        <div className="hidden items-center gap-4 text-[10.5px] text-white/55 sm:flex">
          <span>Үйлчилгээ</span>
          <span>Үнэ</span>
          <span>Бидний тухай</span>
        </div>
        <div className="rounded-md bg-emerald-400 px-2.5 py-1 font-display text-[9.5px] font-semibold tracking-tight text-emerald-950 sm:text-[10.5px]">
          Захиалах
        </div>
      </div>
      <div className="relative grid grid-cols-[1.05fr_0.95fr] gap-3 px-5 pb-5 pt-1 sm:gap-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-400/12 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-300 sm:px-2 sm:text-[9px]">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            Eco · Modern
          </span>
          <h3 className="mt-2 font-display text-[14px] font-semibold leading-[1.08] tracking-tight text-white sm:text-[18px] md:text-[22px]">
            Байгальд ээлтэй
            <br />орчин үеийн салон
          </h3>
          <p className="mt-2 text-[8.5px] leading-[1.5] text-white/55 sm:text-[10.5px]">
            Онлайн захиалга · QPay · AI туслах
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="rounded-md bg-emerald-400 px-2 py-1 font-display text-[9px] font-semibold text-emerald-950 sm:text-[10px]">Цаг авах</div>
            <div className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 font-display text-[9px] font-semibold text-white/85 sm:text-[10px]">Үйлчилгээ</div>
          </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2">
          <div
            className="row-span-2 rounded-md ring-1 ring-white/[0.04]"
            style={{ background: "linear-gradient(150deg, rgba(110,231,183,0.32) 0%, rgba(20,90,65,0.75) 55%, rgba(8,30,25,0.92) 100%)" }}
          />
          <div
            className="rounded-md ring-1 ring-white/[0.04]"
            style={{ background: "linear-gradient(150deg, rgba(167,212,189,0.28) 0%, rgba(45,75,65,0.82) 100%)" }}
          />
          <div
            className="rounded-md ring-1 ring-white/[0.04]"
            style={{ background: "linear-gradient(150deg, rgba(52,211,153,0.18) 0%, rgba(15,45,35,0.85) 100%)" }}
          />
        </div>
      </div>
      {/* the booking strip and Дали's bubble: the two things this site sold */}
      <div className="relative mx-5 mt-1 flex items-end justify-between gap-3 sm:mx-6">
        <div className="rounded-lg bg-white/[0.04] p-2 ring-1 ring-white/[0.06] sm:p-3">
          <p className="text-[7.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80 sm:text-[9px]">Цаг захиалах</p>
          <div className="mt-1.5 flex gap-1 sm:mt-2 sm:gap-1.5">
            {["10:00", "11:30", "14:00", "15:30"].map((slot, i) => (
              <span
                key={slot}
                className={[
                  "rounded px-1 py-0.5 font-display text-[7.5px] font-semibold tabular-nums sm:px-1.5 sm:text-[9.5px]",
                  i === 3 ? "bg-emerald-400 text-emerald-950" : "bg-white/[0.06] text-white/70",
                ].join(" ")}
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-[46%] rounded-lg rounded-br-sm bg-white/[0.08] px-2 py-1.5 ring-1 ring-white/[0.08] sm:px-3 sm:py-2">
          <p className="text-[7px] font-semibold text-emerald-300/90 sm:text-[9px]">Дали</p>
          <p className="mt-0.5 text-[7.5px] leading-[1.35] text-white/80 sm:text-[10px]">Сайн байна уу. Юугаар туслах вэ?</p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink-950/45 to-transparent" />
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, align = "center" }) {
  const wrap = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <Reveal className={wrap}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-[15.5px] leading-[1.65] text-fg-muted">
          {description}
        </p>
      )}
    </Reveal>
  );
}

function ProcessStep({ label, title, desc, dotColor, opacity, y }) {
  const reduced = useReducedMotion();
  const style = reduced
    ? undefined
    : {
        opacity,
        transform: `translate3d(0, ${y}px, 0)`,
        transition: "transform 520ms cubic-bezier(0.16,1,0.3,1), opacity 320ms ease-out",
        willChange: "transform, opacity",
      };
  return (
    <div style={style} className="flex items-start gap-5 md:flex-col md:items-center md:gap-0 md:text-center">
      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-950 ring-1 ring-white/15 shadow-[0_0_0_4px_rgba(5,10,24,1)]">
        <span
          aria-hidden
          className="absolute inset-1 rounded-full"
          style={{ background: `radial-gradient(circle, ${dotColor}33 0%, transparent 70%)` }}
        />
        <span className="relative font-display text-[14px] font-semibold tracking-tight" style={{ color: dotColor }}>
          {label}
        </span>
      </div>
      <div className="pt-1.5 md:mt-6 md:max-w-xs md:pt-0">
        <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg sm:text-[22px]">{title}</h3>
        <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">{desc}</p>
      </div>
    </div>
  );
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
function lerpRange(v, fromA, fromB, toA, toB) {
  const t = clamp((v - fromA) / (fromB - fromA), 0, 1);
  return toA + (toB - toA) * t;
}

function ProcessTimeline() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const ref = React.useRef(null);
  const [progress, setProgress] = React.useState(reduced ? 1 : 0);

  React.useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = vh + r.height;
      const traveled = vh - r.top;
      const raw = traveled / total;
      setProgress(clamp(raw, 0, 1));
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [reduced]);

  const op1 = lerpRange(progress, 0.15, 0.28, 0, 1);
  const ty1 = lerpRange(progress, 0.15, 0.28, 44, 0);
  const op2 = lerpRange(progress, 0.26, 0.40, 0, 1);
  const ty2 = lerpRange(progress, 0.26, 0.40, 44, 0);
  const op3 = lerpRange(progress, 0.38, 0.52, 0, 1);
  const ty3 = lerpRange(progress, 0.38, 0.52, 44, 0);
  const lineProgress = lerpRange(progress, 0.15, 0.55, 0, 1);

  return (
    <section id="process" ref={ref} className="relative py-16 md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="mesh-blob animate-meshShift opacity-50"
          style={{ bottom: "10%", left: "-10%", width: "28rem", height: "28rem", background: "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.16), transparent 70%)" }}
        />
      </div>
      <Container className="relative">
        <SectionHeader
          eyebrow={t("process.section")}
          title={t("process.title")}
          description={t("process.description")}
        />

        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-6 hidden h-px md:block">
            <div className="relative h-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 origin-left"
                style={{
                  transform: `scaleX(${reduced ? 1 : lineProgress})`,
                  width: "100%",
                  background: "linear-gradient(90deg, #38BDF8 0%, #3B82F6 50%, #34D399 100%)",
                  transition: "transform 360ms cubic-bezier(0.16,1,0.3,1)",
                  willChange: "transform",
                }}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute left-6 top-6 bottom-6 w-px md:hidden">
            <div className="relative h-full bg-white/10">
              <div
                className="absolute inset-x-0 top-0 origin-top"
                style={{
                  transform: `scaleY(${reduced ? 1 : lineProgress})`,
                  height: "100%",
                  background: "linear-gradient(180deg, #38BDF8 0%, #3B82F6 50%, #34D399 100%)",
                  transition: "transform 360ms cubic-bezier(0.16,1,0.3,1)",
                  willChange: "transform",
                }}
              />
            </div>
          </div>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <ProcessStep
              label={t("process.step1.label")}
              title={t("process.step1.title")}
              desc={t("process.step1.description")}
              dotColor="#38BDF8"
              opacity={op1}
              y={ty1}
            />
            <ProcessStep
              label={t("process.step2.label")}
              title={t("process.step2.title")}
              desc={t("process.step2.description")}
              dotColor="#3B82F6"
              opacity={op2}
              y={ty2}
            />
            <ProcessStep
              label={t("process.step3.label")}
              title={t("process.step3.title")}
              desc={t("process.step3.description")}
              dotColor="#34D399"
              opacity={op3}
              y={ty3}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

function DiscoveryArt() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="discWaveA" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="step-art-pulse" style={{ transformOrigin: "60px 90px" }}>
        <circle cx="60" cy="90" r="6" fill="#38BDF8" />
        <circle cx="60" cy="90" r="14" fill="none" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="1.2" />
        <circle cx="60" cy="90" r="22" fill="none" stroke="#38BDF8" strokeOpacity="0.22" strokeWidth="1" />
      </g>
      <g stroke="url(#discWaveA)" strokeWidth="1.4" fill="none" strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const offset = i * 22;
          const amp = 14 + i * 2;
          return (
            <path
              key={i}
              className={`step-art-wave step-art-wave-${i}`}
              d={`M ${90 + offset} 90 q 8 -${amp} 16 0 t 16 0`}
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          );
        })}
      </g>
      <g fill="none" stroke="rgba(240,244,255,0.18)" strokeWidth="1">
        {[40, 70, 100, 130].map((y) => (
          <line key={y} x1="20" x2="300" y1={y} y2={y} strokeDasharray="2 6" />
        ))}
      </g>
    </svg>
  );
}

function BuildArt() {
  const nodes = [
    { x: 50, y: 50 }, { x: 50, y: 90 }, { x: 50, y: 130 },
    { x: 160, y: 35 }, { x: 160, y: 75 }, { x: 160, y: 115 }, { x: 160, y: 155 },
    { x: 270, y: 70 }, { x: 270, y: 110 },
  ];
  const links = [
    [0, 3], [0, 4], [1, 3], [1, 4], [1, 5], [2, 5], [2, 6],
    [3, 7], [4, 7], [4, 8], [5, 7], [5, 8], [6, 8],
  ];
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <g stroke="#38BDF8" strokeOpacity="0.35" strokeWidth="1">
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            className={`step-art-link step-art-link-${i % 6}`}
            strokeDasharray="120"
            strokeDashoffset="120"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </g>
      <g>
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="8" fill="rgba(56,189,248,0.10)" />
            <circle
              cx={n.x} cy={n.y} r="3.5"
              fill={i === 4 ? "#34D399" : "#38BDF8"}
              className={`step-art-node step-art-node-${i % 5}`}
              style={{ animationDelay: `${i * 0.12}s`, transformOrigin: `${n.x}px ${n.y}px` }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function LaunchArt() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="launchTrail" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="launchGrid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(240,244,255,0.10)" strokeWidth="1">
        {[140, 110, 80, 50].map((y) => (
          <line key={y} x1="20" x2="300" y1={y} y2={y} strokeDasharray="2 6" />
        ))}
      </g>
      <path
        d="M 20 150 Q 90 120 150 95 T 295 25"
        fill="none"
        stroke="url(#launchTrail)"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="step-art-trail"
        strokeDasharray="400"
        strokeDashoffset="0"
      />
      <path
        d="M 20 150 Q 90 120 150 95 T 295 25 L 295 160 L 20 160 Z"
        fill="url(#launchGrid)"
        opacity="0.45"
      />
      <g className="step-art-rocket" style={{ transformOrigin: "295px 25px" }}>
        <circle cx="295" cy="25" r="4.5" fill="#34D399" />
        <circle cx="295" cy="25" r="9" fill="none" stroke="#34D399" strokeOpacity="0.5" strokeWidth="1" />
      </g>
    </svg>
  );
}

const STEP_ART = {
  "1": DiscoveryArt,
  "2": BuildArt,
  "3": LaunchArt,
};

function StepCard({ step, title, desc }) {
  const Art = STEP_ART[step] || DiscoveryArt;
  return (
    <StaggerItem>
      <article className="step-card group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-[0_28px_60px_-28px_rgba(56,189,248,0.32)]">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 font-display text-[15px] font-semibold tracking-tight text-sky-400">
            {step}
          </span>
          <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{title}</p>
        </div>
        <p className="mt-4 text-[14px] leading-[1.6] text-fg-muted">{desc}</p>
        <div className="relative mt-6 overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900/50">
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 100%, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0) 60%)" }} aria-hidden />
          <div className="aspect-[16/10] p-3">
            <Art />
          </div>
        </div>
      </article>
    </StaggerItem>
  );
}

function DeliverableIcon({ kind }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "site") {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 6.5h.01M10 6.5h.01" />
        <path d="M7 14h6" />
      </svg>
    );
  }
  if (kind === "ai") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function DeliverableCard({ icon, title, desc }) {
  return (
    <StaggerItem>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-[0_28px_60px_-28px_rgba(56,189,248,0.32)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 70%)" }}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-sky-400 transition-colors duration-300 group-hover:border-sky-400/40 group-hover:bg-sky-400/10">
          <DeliverableIcon kind={icon} />
        </div>
        <p className="mt-5 font-display text-[16px] font-semibold tracking-tight text-fg">{title}</p>
        <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">{desc}</p>
      </div>
    </StaggerItem>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section id="how" className="relative py-28">
      <Container>
        <SectionHeader eyebrow={t("howItWorks.section")} title={t("howItWorks.title")} description={t("howItWorks.description")} />

        <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
          <StepCard step={t("howItWorks.discovery.step")} title={t("howItWorks.discovery.title")} desc={t("howItWorks.discovery.description")} />
          <StepCard step={t("howItWorks.buildTrain.step")} title={t("howItWorks.buildTrain.title")} desc={t("howItWorks.buildTrain.description")} />
          <StepCard step={t("howItWorks.launchImprove.step")} title={t("howItWorks.launchImprove.title")} desc={t("howItWorks.launchImprove.description")} />
        </StaggerGroup>

        <Reveal className="mt-20">
          <h3 className="font-display text-[22px] font-semibold tracking-tight text-fg">{t("howItWorks.deliverables")}</h3>
          <p className="mt-2 text-[14.5px] text-fg-muted">{t("howItWorks.deliverablesDesc")}</p>
        </Reveal>

        <StaggerGroup className="mt-6 grid gap-5 md:grid-cols-3">
          <DeliverableCard icon="site" title={t("howItWorks.website.title")} desc={t("howItWorks.website.description")} />
          <DeliverableCard icon="ai" title={t("howItWorks.aiAssistant.title")} desc={t("howItWorks.aiAssistant.description")} />
          <DeliverableCard icon="monthly" title={t("howItWorks.monthlySupport.title")} desc={t("howItWorks.monthlySupport.description")} />
        </StaggerGroup>

        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-400/[0.06] via-ink-800/55 to-ink-800/55 p-7 shadow-[0_30px_70px_-30px_rgba(56,189,248,0.4)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 65%)" }}
            />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <p className="font-display text-[18px] font-semibold tracking-tight text-fg sm:text-[19px]">{t("howItWorks.cta")}</p>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-fg-muted">{t("howItWorks.ctaDesc")}</p>
              </div>
              <MagneticButton href="#demo" variant="primary">{t("pricing.paymentTerms.cta")}</MagneticButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function Portfolio() {
  const { t } = useTranslation();
  return (
    <section id="portfolio" className="relative py-16 md:py-28">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>{t("portfolio.section")}</SectionLabel>
              <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">
                {t("portfolio.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-[15.5px] leading-[1.65] text-fg-muted">
                {t("portfolio.description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <MagneticButton href="https://app.dalatech.online" variant="primary">{t("portfolio.createDemo")}</MagneticButton>
              <MagneticButton href="#demo" variant="ghost" demoServices={WEBSITE_DALI_DEMO_SERVICES}>{t("portfolio.getDemo")}</MagneticButton>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            {/* the client is not named on this site, so the mock is not a link */}
            <div className="relative">
              <BrowserMockup url={t("portfolio.case.url")}>
                <SalonPreview />
              </BrowserMockup>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Pill>{t("portfolio.case.pills.website")}</Pill>
              <Pill>{t("portfolio.case.pills.chatbot")}</Pill>
              <Pill>{t("portfolio.case.pills.productQA")}</Pill>
              <Pill>{t("portfolio.case.pills.availability")}</Pill>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card-glow flex h-full flex-col rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card">
              <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("portfolio.case.title")}</h3>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-fg-muted">{t("portfolio.case.description")}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("portfolio.case.whatWeBuilt")}</p>
                  <ul className="mt-3 space-y-2 text-[13.5px] text-fg/85">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2.5">
                        <CheckIcon />
                        <span>{t(`portfolio.case.features.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("portfolio.case.idealOutcomes")}</p>
                  <ul className="mt-3 space-y-2 text-[13.5px] text-fg/85">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2.5">
                        <CheckIcon />
                        <span>{t(`portfolio.case.outcomes.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton href="#demo" variant="primary" demoServices={WEBSITE_DALI_DEMO_SERVICES}>{t("portfolio.case.buttons.requestDemo")}</MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const ASK_CHIPS = [
  { id: "u1", label: "liveDemo.messages.user1", reply: "liveDemo.messages.ai1" },
  { id: "u2", label: "liveDemo.messages.user2", reply: "liveDemo.messages.ai2" },
  { id: "u3", label: "liveDemo.ask.chip3", reply: null },
];

// The hand-off: the one moment on the page driven by physics rather than by
// scroll. It rises from under the Messenger card and overlaps it, because the
// point is that the conversation left the bot and reached a person.
function HandoffCard({ question }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 24, mass: 0.7, delay: reduced ? 0 : 0.04 }}
      className="relative z-10 -mt-11 mx-3 rounded-[18px] border border-white/[0.1] bg-ink-800 p-4 shadow-[0_24px_60px_-20px_rgba(3,6,16,0.95)]"
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        {t("liveDemo.ask.handoffTitle")}
      </p>
      <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-dim">{t("liveDemo.ask.handoffLine")}</p>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-fg/90">{question}</p>
    </motion.div>
  );
}

function LiveDemo() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scrollRef = React.useRef(null);
  const sectionRef = React.useRef(null);
  const [step, setStep] = React.useState(0);
  const [typing, setTyping] = React.useState(false);
  // "script" until the scripted demo ends, then the visitor can ask.
  const [phase, setPhase] = React.useState("script");
  const [asked, setAsked] = React.useState([]);
  const askTimers = React.useRef([]);
  React.useEffect(() => () => askTimers.current.forEach(clearTimeout), []);

  React.useEffect(() => {
    if (reduced) {
      setStep(5);
      setTyping(false);
      return;
    }

    let timers = [];
    const runOnce = () => {
      const timeline = [
        { at: 0,    fn: () => { setStep(0); setTyping(false); } },
        { at: 350,  fn: () => { setStep(1); } },
        { at: 1500, fn: () => { setTyping(true); } },
        { at: 2700, fn: () => { setStep(2); setTyping(false); } },
        { at: 4200, fn: () => { setStep(3); } },
        { at: 5400, fn: () => { setTyping(true); } },
        { at: 7000, fn: () => { setStep(4); setTyping(false); } },
        { at: 8400, fn: () => { setTyping(true); } },
        { at: 9900, fn: () => { setStep(5); setTyping(false); } },
      ];
      timeline.forEach(({ at, fn }) => {
        timers.push(setTimeout(fn, at));
      });
    };

    // This used to run on a 13.5s interval from mount for the life of the
    // visit, burning battery on a phone whether or not the section was on
    // screen. Play it once, when it is actually being looked at.
    const host = sectionRef.current;
    if (!host) return undefined;
    let played = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !played) {
            played = true;
            runOnce();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(host);

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [reduced]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [step, typing, reduced, asked, phase]);

  // A chip becomes a user bubble, a beat of typing, then either the answer the
  // site already ships or — for the one she cannot answer — a plain refusal
  // and a hand-off to a person.
  const ask = React.useCallback(
    (chip) => {
      if (phase === "answering") return;
      askTimers.current.forEach(clearTimeout);
      askTimers.current = [];
      setPhase("answering");
      setAsked((prev) => [...prev, { id: `${chip.id}-${prev.length}`, chip, state: "sent" }]);
      const beat = reduced ? 0 : 900;
      const settle = () => {
        setAsked((prev) => prev.map((a, i) => (i === prev.length - 1 ? { ...a, state: "answered" } : a)));
        setPhase(chip.reply ? "idle" : "handover");
      };
      if (beat === 0) settle();
      else askTimers.current.push(setTimeout(settle, beat));
    },
    [phase, reduced]
  );

  // Both cards have to be visible at once or the hand-off does not read.
  const handover = phase === "handover";

  const messages = [
    { from: "user", key: "user1", at: 1 },
    { from: "ai",   key: "ai1",   at: 2 },
    { from: "user", key: "user2", at: 3 },
    { from: "ai",   key: "ai2",   at: 4 },
    { from: "ai",   key: "ai3",   at: 5 },
  ];

  return (
    <section id="live-demo" ref={sectionRef} className="relative py-28">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal>
            <SectionLabel>{t("liveDemo.section")}</SectionLabel>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">
              {t("liveDemo.title")}
            </h2>
            <p className="mt-5 max-w-[44ch] text-[15.5px] leading-[1.65] text-fg-muted">
              {t("liveDemo.description")}
            </p>
            <div className="mt-9">
              <MagneticButton variant="primary" href="#demo" demoServices={["dali"]}>
                {t("liveDemo.ctaLabel")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative mx-auto w-full max-w-[440px]">
              <motion.div
                animate={handover ? { y: reduced ? 0 : 6, opacity: 0.55 } : { y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 210, damping: 24, mass: 0.7 }}
                className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-ink-900/85 shadow-[0_40px_90px_-30px_rgba(8,12,28,0.9)] backdrop-blur">
                <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-sky-400/[0.06] ring-1 ring-inset ring-sky-400/45">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(186,230,253)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 2 14.5 8.5 21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
                      </svg>
                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-900" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[14px] font-semibold tracking-tight text-fg">
                        {t("liveDemo.widget.businessName")}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {t("liveDemo.widget.statusOnline")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-fg-muted/60">
                    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                      </svg>
                    </span>
                    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="relative h-[300px] overflow-y-auto px-4 py-5 lg:h-[380px]"
                  style={{ scrollbarWidth: "none" }}
                >
                  <div className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {messages
                        .filter((m) => step >= m.at)
                        .map((m) => (
                          <motion.div
                            key={m.key}
                            layout
                            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                            className={[
                              "flex w-full items-end gap-2",
                              m.from === "user" ? "justify-end" : "justify-start",
                            ].join(" ")}
                          >
                            {m.from === "ai" && (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 ring-1 ring-inset ring-sky-400/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                              </div>
                            )}
                            <div
                              className={[
                                "max-w-[78%] px-3.5 py-2.5 text-[13.5px] leading-[1.5]",
                                m.from === "user"
                                  ? "rounded-2xl rounded-br-md bg-sky-400/[0.14] text-fg ring-1 ring-inset ring-sky-400/25"
                                  : "rounded-2xl rounded-bl-md bg-white/[0.04] text-fg/95 ring-1 ring-inset ring-white/[0.06]",
                              ].join(" ")}
                            >
                              {t(`liveDemo.messages.${m.key}`)}
                            </div>
                          </motion.div>
                        ))}
                      {typing && !reduced && (
                        <motion.div
                          key="typing"
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
                          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                          className="flex w-full items-end gap-2"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 ring-1 ring-inset ring-sky-400/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                          </div>
                          <div className="rounded-2xl rounded-bl-md bg-white/[0.04] px-3.5 py-3 ring-1 ring-inset ring-white/[0.06]">
                            <span className="flex items-center gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="h-1.5 w-1.5 rounded-full bg-fg-muted/75"
                                  animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
                                  transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                                />
                              ))}
                            </span>
                            <span className="sr-only">{t("liveDemo.widget.typing")}</span>
                          </div>
                        </motion.div>
                      )}
                      {asked.map((a) => (
                        <React.Fragment key={a.id}>
                          <motion.div
                            layout
                            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                            className="flex w-full items-end justify-end gap-2"
                          >
                            <div className="max-w-[78%] rounded-2xl rounded-br-md bg-sky-400/[0.14] px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-fg ring-1 ring-inset ring-sky-400/25">
                              {t(a.chip.label)}
                            </div>
                          </motion.div>
                          {a.state === "answered" && a.chip.reply && (
                            <motion.div
                              layout
                              initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                              className="flex w-full items-end justify-start gap-2"
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 ring-1 ring-inset ring-sky-400/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                              </div>
                              <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-fg/95 ring-1 ring-inset ring-white/[0.06]">
                                {t(a.chip.reply)}
                              </div>
                            </motion.div>
                          )}
                          {a.state === "answered" && !a.chip.reply && (
                            <motion.div
                              layout
                              initial={reduced ? false : { opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-3"
                            >
                              {/* no bubble, no red, no warning icon: a refusal
                                  is a normal thing for her to do, not an error */}
                              <p className="border-y border-white/[0.06] py-2.5 text-[13px] leading-[1.5] text-fg-muted">
                                {t("liveDemo.ask.decline")}
                              </p>
                              <div className="flex w-full items-end justify-start gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 ring-1 ring-inset ring-sky-400/30">
                                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                                </div>
                                <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-fg/95 ring-1 ring-inset ring-white/[0.06]">
                                  {t("liveDemo.messages.ai3")}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </React.Fragment>
                      ))}
                      {phase === "answering" && !reduced && (
                        <motion.div
                          key="ask-typing"
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
                          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                          className="flex w-full items-end gap-2"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 ring-1 ring-inset ring-sky-400/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                          </div>
                          <div className="rounded-2xl rounded-bl-md bg-white/[0.04] px-3.5 py-3 ring-1 ring-inset ring-white/[0.06]">
                            <span className="flex items-center gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="h-1.5 w-1.5 rounded-full bg-fg-muted/75"
                                  animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
                                  transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                                />
                              ))}
                            </span>
                            <span className="sr-only">{t("liveDemo.widget.typing")}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] bg-white/[0.015] px-3 py-3">
                  {step < 5 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-ink-950/45 px-3.5 py-2.5 text-[13px] text-fg-muted/80">
                      <span className="flex-1 truncate">{t("liveDemo.widget.inputPlaceholder")}</span>
                      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/30">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 14-7-7 14-2-5z" />
                        </svg>
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="px-0.5 text-[11.5px] text-fg-muted">{t("liveDemo.ask.prompt")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ASK_CHIPS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={phase === "answering"}
                            onClick={() => ask(c)}
                            className="pressable min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-left text-[12.5px] leading-[1.35] text-fg/90 transition-colors hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-50"
                          >
                            {t(c.label)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted/55">
                    {t("liveDemo.widget.footnote")}
                  </p>
                </div>
              </motion.div>

              {handover && <HandoffCard question={t("liveDemo.ask.chip3")} />}

              {handover && (
                <motion.p
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: reduced ? 0 : 0.25 }}
                  className="mt-6 text-[19px] font-medium leading-[1.45] text-fg"
                >
                  {t("liveDemo.ask.reassure")}
                </motion.p>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ----------------------------------------------------------- demo request */

/** Options offered as chips, in display order. Keys are shared with the API. */
// The four AI staff from /office come first so a visitor arriving from a desk
// sees their choice at the top of the chips.
const DEMO_SERVICES = ["dali", "vira", "eho", "nova", "ora", "website", "unsure"];
// The kinds of business that write to us, for the second question.
const DEMO_SECTORS = ["salon", "shop", "clinic", "food", "auto", "education", "other"];

const DEMO_DRAFT_KEY = "dalatech:demo-draft";
/** Pre-selected chips for CTAs whose context already implies a product. */
const WEBSITE_DALI_DEMO_SERVICES = ["website", "dali"];
const WEBSITE_DEMO_SERVICES = ["website"];

const DEMO_ENDPOINT = "/api/demo-request";
const DEMO_SUBMIT_TIMEOUT_MS = 25000;
const DEMO_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const DEMO_EMAIL = "dalatech.ai@gmail.com";
const DEMO_MESSENGER = "https://m.me/61586065058744";

const EMPTY_DEMO_FORM = {
  name: "",
  phone: "",
  business: "",
  sector: "",
  services: [],
  note: "",
  email: "",
  // Honeypot. Hidden from people, usually filled by bots. A filled value is
  // still delivered — flagged, never dropped — so a stray autofill cannot
  // silently swallow a real request.
  website: "",
};

const DemoRequestContext = React.createContext({
  open: () => {
    console.error("DemoRequestProvider is missing — the demo form cannot open.");
  },
});

function useDemoRequest() {
  return React.useContext(DemoRequestContext);
}

/**
 * localStorage, not sessionStorage: Facebook's in-app browser is routinely
 * torn down when the visitor switches apps, and every link they open can start
 * a fresh session — which is exactly when a half-typed form needs recovering.
 * The TTL keeps a stale draft from surfacing days later on a shared phone.
 */
function readDemoDraft() {
  try {
    const raw = window.localStorage.getItem(DEMO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.values) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > DEMO_DRAFT_TTL_MS) {
      clearDemoDraft();
      return null;
    }
    return {
      ...EMPTY_DEMO_FORM,
      ...parsed.values,
      services: Array.isArray(parsed.values.services)
        ? parsed.values.services.filter((s) => DEMO_SERVICES.includes(s))
        : [],
      sector: DEMO_SECTORS.includes(parsed.values.sector) ? parsed.values.sector : "",
    };
  } catch (error) {
    // Private browsing and quota errors must never stop the form from opening.
    console.error("demo form: could not read the saved draft:", error);
    return null;
  }
}

function writeDemoDraft(values) {
  try {
    window.localStorage.setItem(
      DEMO_DRAFT_KEY,
      JSON.stringify({ savedAt: Date.now(), values })
    );
  } catch (error) {
    console.error("demo form: could not save the draft:", error);
  }
}

function clearDemoDraft() {
  try {
    window.localStorage.removeItem(DEMO_DRAFT_KEY);
  } catch (error) {
    console.error("demo form: could not clear the draft:", error);
  }
}

function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Digits only, with an optional 976 country prefix removed. */
function demoPhoneDigits(value) {
  return value.replace(/[^\d]/g, "").replace(/^976/, "");
}

function validateDemoForm(values, t) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = t("demoForm.errors.name");
  // Eight digits is the Mongolian shape and what the copy asks for, but a
  // number typed in international form is accepted too — the client must never
  // turn away someone the API would have taken.
  const phone = values.phone.trim();
  const local = demoPhoneDigits(phone);
  const international = phone.startsWith("+") && local.length >= 8 && local.length <= 15;
  if (local.length !== 8 && !international) errors.phone = t("demoForm.errors.phone");
  if (values.business.trim().length < 2) errors.business = t("demoForm.errors.business");
  const email = values.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = t("demoForm.errors.email");
  }
  return errors;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDemoRequest(payload, signal) {
  const response = await fetch(DEMO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // A body we cannot parse is only fatal when the status is also bad; the
    // status check below decides, so record the reason and carry on.
    console.error("demo form: response body was not JSON:", error);
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `http_${response.status}`);
    error.status = response.status;
    error.fields = data && data.fields;
    throw error;
  }
  return data;
}

/** Everything the visitor typed, as a mail body, so a failed send loses nothing. */
function demoMailtoHref(values, t) {
  const lines = [
    `${t("demoForm.fields.name.label")}: ${values.name}`,
    `${t("demoForm.fields.phone.label")}: ${values.phone}`,
    `${t("demoForm.fields.business.label")}: ${values.business}`,
    `${t("demoForm.fields.services.label")} ${values.services
      .map((s) => t(`demoForm.serviceCards.${s}.title`))
      .join(", ")}`,
  ];
  if (values.email.trim()) lines.push(`${t("demoForm.fields.email.label")}: ${values.email}`);
  if (values.note.trim()) lines.push("", values.note);
  return (
    `mailto:${DEMO_EMAIL}` +
    `?subject=${encodeURIComponent(t("demoForm.title"))}` +
    `&body=${encodeURIComponent(lines.join("\n"))}`
  );
}

function DemoField({ id, label, optional, error, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {optional && <span className="text-[11.5px] text-fg-dim">{optional}</span>}
      </div>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-rose-300">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[12px] text-fg-dim">{hint}</p>
      )}
    </div>
  );
}

const DEMO_INPUT_CLASS =
  "field w-full rounded-xl px-3.5 py-3 text-[16px] leading-[1.4] outline-none";

function DemoRequestDialog({ isOpen, onClose, preset }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  const [values, setValues] = React.useState(EMPTY_DEMO_FORM);
  const [errors, setErrors] = React.useState({});
  const [status, setStatus] = React.useState("idle"); // idle | sending | sent | failed
  const [failureKind, setFailureKind] = React.useState(null);
  // Three screens, one question each: what, whose business, how to reach you.
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);

  const panelRef = React.useRef(null);
  const firstFieldRef = React.useRef(null);
  const failureRef = React.useRef(null);
  const successRef = React.useRef(null);
  const requestIdRef = React.useRef(null);
  const abortRef = React.useRef(null);
  const restoreFocusRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Restore anything typed earlier in this tab, then layer the preset from the
  // button that opened the dialog on top of it.
  React.useEffect(() => {
    if (!isOpen) return;
    const draft = readDemoDraft();
    setValues((current) => {
      const restored = draft || (current.name || current.phone ? current : EMPTY_DEMO_FORM);
      // a draft saved before a chip was retired must not submit it
      const base = { ...restored, services: restored.services.filter((sv) => DEMO_SERVICES.includes(sv)) };
      if (!preset || !preset.length) return base;
      // The button that opened the form states the selection: its preset
      // replaces whatever was picked on an earlier visit, so the chips always
      // match what the visitor just chose. Typed fields are kept.
      const wanted = preset.filter((s) => DEMO_SERVICES.includes(s));
      return { ...base, services: wanted.length ? wanted : base.services };
    });
    setErrors({});
    setStatus("idle");
    setFailureKind(null);
    // A button that already said what it is for skips the first question.
    setStep(preset && preset.length ? 1 : 0);
    setDir(1);
  }, [isOpen, preset]);

  // Android's back gesture is the universal "dismiss" on a phone, and there is
  // no Escape key there. Without an entry of our own to pop, Back would take
  // the visitor off the site entirely and lose the request.
  //
  // Keyed on isOpen alone. A version keyed on onClose too re-ran whenever the
  // provider re-rendered: its cleanup popped our entry, its body pushed a
  // fresh one, and once the pops and pushes crossed the visitor's real
  // previous page was the one that got popped. onClose is read through a ref.
  React.useEffect(() => {
    if (!isOpen) return undefined;

    let poppedByVisitor = false;
    window.history.pushState({ ...window.history.state, dalatechDemoDialog: true }, "");

    const onPopState = () => {
      poppedByVisitor = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      // Closed with the button or Escape instead: drop the entry we added so
      // the next Back press does what the visitor expects.
      if (!poppedByVisitor && window.history.state && window.history.state.dalatechDemoDialog) {
        window.history.back();
      }
    };
  }, [isOpen]);

  // Escape to close, focus trapped inside the panel, page behind frozen, and
  // the floating chat button hidden so it cannot overlap the sheet.
  React.useEffect(() => {
    if (!isOpen) return undefined;

    restoreFocusRef.current = document.activeElement;
    lockBodyScroll();
    setStagesFrozen(true);
    document.documentElement.classList.add("demo-dialog-open");

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
      document.documentElement.classList.remove("demo-dialog-open");
      const previous = restoreFocusRef.current;
      // preventScroll: restoring focus must not scroll the page under the
      // closing sheet, which would kick every scroll-linked spring into motion
      // just as the exit animation starts.
      if (previous && typeof previous.focus === "function") previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // On a phone, opening the keyboard immediately would hide the form, so only
  // desktop gets the cursor placed for it. Runs again on each step.
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const target = isMobile || step === 0 ? panelRef.current : firstFieldRef.current;
    const id = window.setTimeout(() => target && target.focus(), 60);
    return () => window.clearTimeout(id);
  }, [isOpen, isMobile, step]);

  // A live region that appears together with its content is announced
  // unreliably, so move focus to the confirmation heading instead.
  React.useEffect(() => {
    if (status !== "sent" || !successRef.current) return;
    successRef.current.focus();
  }, [status]);

  // The submit button sits below the fold on a phone, so a failure that
  // renders further up would otherwise go unread.
  React.useEffect(() => {
    if (status !== "failed" || !failureRef.current) return;
    failureRef.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
  }, [status, failureKind, reduced]);

  // A dialog torn down mid-flight must not leave a request hanging.
  React.useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  // Mirror every keystroke into localStorage: a backgrounded tab, a reload or
  // a failed send must never cost the visitor what they typed.
  React.useEffect(() => {
    if (!isOpen || status === "sent") return;
    writeDemoDraft(values);
  }, [values, isOpen, status]);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const toggleService = (service) => {
    setValues((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((s) => s !== service)
        : [...current.services, service],
    }));
  };

  const go = (next) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    if (panelRef.current) {
      const body = panelRef.current.querySelector(".demo-sheet-body");
      if (body) body.scrollTop = 0;
    }
  };

  const focusInvalid = () => {
    const firstInvalid = panelRef.current?.querySelector("[aria-invalid='true']");
    if (firstInvalid) firstInvalid.focus();
  };

  const next = () => {
    if (step === 1) {
      if (values.business.trim().length < 2) {
        setErrors({ business: t("demoForm.errors.business") });
        focusInvalid();
        return;
      }
    }
    go(step + 1);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (status === "sending") return;
    if (step < 2) {
      next();
      return;
    }

    const found = validateDemoForm(values, t);
    if (Object.keys(found).length) {
      setErrors(found);
      // the business field lives two screens back
      if (found.business && !found.name && !found.phone && !found.email) go(1);
      window.setTimeout(focusInvalid, 0);
      return;
    }

    if (!requestIdRef.current) requestIdRef.current = newRequestId();

    const sectorLabel = values.sector ? t(`demoForm.sectors.${values.sector}`, { defaultValue: "" }) : "";
    const payload = {
      requestId: requestIdRef.current,
      name: values.name.trim(),
      phone: values.phone.trim(),
      // the API has one business field; the sector rides along in it
      business: sectorLabel ? `${values.business.trim()} (${sectorLabel})` : values.business.trim(),
      services: values.services,
      note: values.note.trim(),
      email: values.email.trim(),
      website: values.website,
      page: location.pathname,
      locale: i18n.language,
    };

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), DEMO_SUBMIT_TIMEOUT_MS);

    setStatus("sending");
    setFailureKind(null);

    try {
      let lastError = null;
      // One retry: a dropped mobile connection is the common failure here, and
      // a duplicate notification is far cheaper than a lost request. The
      // request id is stable across attempts so duplicates are recognisable.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await postDemoRequest(payload, controller.signal);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (controller.signal.aborted) break;
          if (error.status && error.status < 500) break;
          if (attempt === 0) await delay(1500);
        }
      }
      if (lastError) throw lastError;

      requestIdRef.current = null;
      clearDemoDraft();
      setStatus("sent");
    } catch (error) {
      console.error("demo form: request failed:", error);
      if (error.name === "AbortError") {
        setFailureKind("timeout");
      } else if (error.status === 400) {
        setFailureKind("rejected");
      } else {
        setFailureKind("delivery");
      }
      setStatus("failed");
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
    }
  };

  const startOver = () => {
    setValues(EMPTY_DEMO_FORM);
    clearDemoDraft();
    setErrors({});
    setStatus("idle");
    setFailureKind(null);
    go(0);
  };

  const sending = status === "sending";
  const phoneLabel = values.phone.trim();
  const steps = [t("demoForm.steps.what"), t("demoForm.steps.business"), t("demoForm.steps.contact")];
  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 28 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -22 * dir },
      };

  return (
    <AnimatePresence onExitComplete={() => { if (!isOpen) setStagesFrozen(false); }}>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
          style={{ zIndex: 2147483647 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-request-title"
        >
          <motion.button
            type="button"
            aria-label={t("demoForm.close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            /* no backdrop-filter: at this opacity over a near-black page the
               blur is invisible, but it forced the whole viewport to be
               re-sampled and re-blurred on every frame of the exit */
            className="absolute inset-0 bg-ink-950/92"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: isMobile ? 40 : 16, scale: isMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: isMobile ? 40 : 8, scale: isMobile ? 1 : 0.98 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className="demo-sheet relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl outline-none sm:rounded-2xl"
          >
            <div className="border-b border-white/[0.07] px-5 pt-4 sm:px-7 sm:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                    {status === "sent" ? t("demoForm.eyebrow") : t("demoForm.stepOf", { n: step + 1, total: steps.length })}
                  </p>
                  <h2
                    id="demo-request-title"
                    className="mt-1.5 font-display text-[21px] font-semibold tracking-tight text-fg sm:text-[23px]"
                  >
                    {status === "sent" ? t("demoForm.title") : steps[step]}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="pressable -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-fg-muted transition-colors hover:border-white/25 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:h-9 sm:w-9"
                  aria-label={t("demoForm.close")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              {/* the rail: where you are in the three questions */}
              {status !== "sent" && (
                <div className="mt-4 flex gap-1.5 pb-4" aria-hidden>
                  {steps.map((label, i) => (
                    <span
                      key={label}
                      className={["h-[3px] flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-sky-400" : "bg-white/[0.08]"].join(" ")}
                    />
                  ))}
                </div>
              )}
              {status === "sent" && <div className="pb-4" />}
            </div>

            {status === "sent" ? (
              <div
                className="demo-sheet-body px-5 py-9 text-center sm:px-7"
                style={{ paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom))" }}
                aria-live="polite"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sky-400/40 bg-sky-400/10 text-sky-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3
                  ref={successRef}
                  tabIndex={-1}
                  className="mt-5 font-display text-[20px] font-semibold tracking-tight text-fg outline-none"
                >
                  {t("demoForm.success.title")}
                </h3>
                <p className="mx-auto mt-2.5 max-w-[34ch] text-[14.5px] leading-[1.6] text-fg-muted">
                  {t("demoForm.success.body", { phone: phoneLabel })}
                </p>
                <div className="mt-7 flex flex-col items-center gap-3">
                  <MagneticButton onClick={onClose} variant="primary">
                    {t("demoForm.success.close")}
                  </MagneticButton>
                  <Link
                    to="/office"
                    onClick={onClose}
                    className="inline-flex min-h-[44px] items-center gap-1 text-[14.5px] text-sky-400 transition-colors hover:text-sky-300"
                  >
                    {t("demoForm.success.meanwhile")} <span aria-hidden>›</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="demo-sheet-body px-5 py-5 sm:px-7">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={step} {...slide} transition={{ duration: 0.22, ease: EASE_OUT }}>
                      {step === 0 && (
                        <fieldset disabled={sending} className="border-0 p-0">
                          <legend className="text-[14px] leading-[1.6] text-fg-muted">{t("demoForm.fields.services.hint")}</legend>
                          <div className="mt-4 grid grid-cols-2 gap-2.5">
                            {DEMO_SERVICES.map((service, i) => {
                              const active = values.services.includes(service);
                              const agent = STAFF_LIVE[service] !== undefined;
                              // an odd count leaves the last card alone on its row; let it take the row
                              const wide = DEMO_SERVICES.length % 2 === 1 && i === DEMO_SERVICES.length - 1;
                              return (
                                <button
                                  key={service}
                                  type="button"
                                  onClick={() => toggleService(service)}
                                  aria-pressed={active}
                                  className={[
                                    "pressable flex min-h-[64px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
                                    wide ? "col-span-2" : "",
                                    active
                                      ? "border-sky-400/60 bg-sky-400/12"
                                      : "border-white/10 bg-white/[0.02] hover:border-white/25",
                                  ].join(" ")}
                                >
                                  {agent ? (
                                    <span className="flex h-[36px] w-[32px] shrink-0 items-start justify-center overflow-hidden rounded-[9px] bg-white/[0.06]">
                                      <StaffAvatar id={service} size={2} className="-mt-[60px]" />
                                    </span>
                                  ) : (
                                    <span className="flex h-[36px] w-[32px] shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06] text-fg-muted" aria-hidden>
                                      {service === "website" ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>
                                      ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 3.5" /><path d="M12 17h.01" /></svg>
                                      )}
                                    </span>
                                  )}
                                  <span className="min-w-0">
                                    <span className={["block text-[14px] font-semibold leading-tight", active ? "text-sky-100" : "text-fg"].join(" ")}>
                                      {t(`demoForm.serviceCards.${service}.title`)}
                                    </span>
                                    <span className="mt-0.5 block text-[11.5px] leading-tight text-fg-dim">
                                      {agent && !STAFF_LIVE[service] ? t("office.status.soon") : t(`demoForm.serviceCards.${service}.line`)}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      )}

                      {step === 1 && (
                        <div className="space-y-5">
                          <DemoField id="demo-business" label={t("demoForm.fields.business.label")} error={errors.business}>
                            <input
                              ref={firstFieldRef}
                              id="demo-business"
                              name="business"
                              type="text"
                              className={DEMO_INPUT_CLASS}
                              placeholder={t("demoForm.fields.business.placeholder")}
                              value={values.business}
                              onChange={(e) => update("business", e.target.value)}
                              autoComplete="organization"
                              enterKeyHint="next"
                              spellCheck={false}
                              maxLength={100}
                              disabled={sending}
                              aria-invalid={errors.business ? "true" : undefined}
                              aria-describedby={errors.business ? "demo-business-error" : undefined}
                            />
                          </DemoField>
                          <fieldset disabled={sending} className="border-0 p-0">
                            <legend className="text-[13px] font-medium text-fg">{t("demoForm.fields.sector.label")}</legend>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {DEMO_SECTORS.map((sector) => {
                                const active = values.sector === sector;
                                return (
                                  <button
                                    key={sector}
                                    type="button"
                                    onClick={() => update("sector", active ? "" : sector)}
                                    aria-pressed={active}
                                    className={[
                                      "pressable min-h-[44px] rounded-full border px-4 py-2.5 text-[13.5px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
                                      active
                                        ? "border-sky-400/60 bg-sky-400/12 text-sky-100"
                                        : "border-white/10 bg-white/[0.02] text-fg-muted hover:border-white/25 hover:text-fg",
                                    ].join(" ")}
                                  >
                                    {t(`demoForm.sectors.${sector}`)}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-5">
                          <DemoField id="demo-name" label={t("demoForm.fields.name.label")} error={errors.name}>
                            <input
                              ref={firstFieldRef}
                              id="demo-name"
                              name="name"
                              type="text"
                              className={DEMO_INPUT_CLASS}
                              placeholder={t("demoForm.fields.name.placeholder")}
                              value={values.name}
                              onChange={(e) => update("name", e.target.value)}
                              autoComplete="name"
                              enterKeyHint="next"
                              spellCheck={false}
                              autoCapitalize="words"
                              maxLength={80}
                              disabled={sending}
                              aria-invalid={errors.name ? "true" : undefined}
                              aria-describedby={errors.name ? "demo-name-error" : undefined}
                            />
                          </DemoField>

                          <DemoField
                            id="demo-phone"
                            label={t("demoForm.fields.phone.label")}
                            error={errors.phone}
                            hint={t("demoForm.fields.phone.hint")}
                          >
                            <input
                              id="demo-phone"
                              name="phone"
                              type="tel"
                              inputMode="tel"
                              className={DEMO_INPUT_CLASS}
                              placeholder={t("demoForm.fields.phone.placeholder")}
                              value={values.phone}
                              onChange={(e) => update("phone", e.target.value)}
                              autoComplete="tel"
                              enterKeyHint="next"
                              maxLength={32}
                              disabled={sending}
                              aria-invalid={errors.phone ? "true" : undefined}
                              aria-describedby={errors.phone ? "demo-phone-error" : undefined}
                            />
                          </DemoField>

                          <DemoField
                            id="demo-email"
                            label={t("demoForm.fields.email.label")}
                            optional={t("demoForm.optional")}
                            error={errors.email}
                          >
                            <input
                              id="demo-email"
                              name="email"
                              type="email"
                              inputMode="email"
                              className={DEMO_INPUT_CLASS}
                              placeholder={t("demoForm.fields.email.placeholder")}
                              value={values.email}
                              onChange={(e) => update("email", e.target.value)}
                              autoComplete="email"
                              enterKeyHint="next"
                              spellCheck={false}
                              autoCapitalize="off"
                              autoCorrect="off"
                              maxLength={160}
                              disabled={sending}
                              aria-invalid={errors.email ? "true" : undefined}
                              aria-describedby={errors.email ? "demo-email-error" : undefined}
                            />
                          </DemoField>

                          <DemoField
                            id="demo-note"
                            label={t("demoForm.fields.note.label")}
                            optional={t("demoForm.optional")}
                          >
                            <textarea
                              id="demo-note"
                              name="note"
                              rows={3}
                              className={`${DEMO_INPUT_CLASS} resize-y`}
                              placeholder={t("demoForm.fields.note.placeholder")}
                              value={values.note}
                              onChange={(e) => update("note", e.target.value)}
                              spellCheck={false}
                              maxLength={1000}
                              disabled={sending}
                            />
                          </DemoField>

                          {/* what they chose, so the last screen is also the summary */}
                          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-[12.5px] leading-[1.6] text-fg-muted">
                            <span className="font-medium text-fg">{values.business.trim() || t("demoForm.summary.noBusiness")}</span>
                            {" · "}
                            {values.services.length
                              ? values.services.map((s) => t(`demoForm.serviceCards.${s}.title`)).join(", ")
                              : t("demoForm.serviceCards.unsure.title")}
                          </p>

                          {/* Honeypot — off-screen rather than display:none so bots still see it. */}
                          <div aria-hidden className="demo-honeypot">
                            <label htmlFor="demo-website">Website</label>
                            <input
                              id="demo-website"
                              name="website"
                              type="text"
                              tabIndex={-1}
                              autoComplete="off"
                              value={values.website}
                              onChange={(e) => update("website", e.target.value)}
                            />
                          </div>

                          {status === "failed" && (
                            <div
                              ref={failureRef}
                              className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] p-4"
                              role="alert"
                              aria-live="assertive"
                            >
                              <p className="text-[14px] font-semibold text-rose-100">
                                {t(`demoForm.failure.${failureKind === "rejected" ? "rejectedTitle" : "title"}`)}
                              </p>
                              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-rose-100/80">
                                {t(`demoForm.failure.${failureKind === "rejected" ? "rejectedBody" : "body"}`)}
                              </p>
                              {failureKind !== "rejected" && (
                                <div className="mt-3.5 flex flex-wrap gap-2">
                                  <a
                                    href={DEMO_MESSENGER}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pressable rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-fg transition-colors hover:border-white/30"
                                  >
                                    {t("demoForm.failure.messenger")}
                                  </a>
                                  <a
                                    href={demoMailtoHref(values, t)}
                                    className="pressable rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-fg transition-colors hover:border-white/30"
                                  >
                                    {t("demoForm.failure.email")}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div
                  className="border-t border-white/[0.07] bg-ink-900/80 px-5 py-4 sm:px-7"
                  style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
                >
                  <div className="flex items-center gap-3">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => go(step - 1)}
                        disabled={sending}
                        className="pressable flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 text-[14px] font-medium text-fg-muted transition-colors hover:border-white/25 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:opacity-60"
                      >
                        <span aria-hidden>‹</span> {t("demoForm.back")}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={sending}
                      className="pressable flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-fg px-5 text-[15px] font-semibold tracking-tight text-ink-950 transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sending && (
                        <span
                          aria-hidden
                          className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/25 border-t-ink-950"
                        />
                      )}
                      {step < 2
                        ? t("demoForm.next")
                        : sending
                          ? t("demoForm.submitting")
                          : status === "failed"
                            ? t("demoForm.retry")
                            : t("demoForm.submit")}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[11.5px] leading-[1.5] text-fg-dim">
                    {step === 2 ? t("demoForm.privacy") : t("demoForm.subtitle")}
                  </p>
                  {status === "failed" && (
                    <button
                      type="button"
                      onClick={startOver}
                      className="mt-2 w-full text-center text-[12px] text-fg-dim underline-offset-4 transition-colors hover:text-fg-muted hover:underline"
                    >
                      {t("demoForm.startOver")}
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Shown only if the dialog itself throws while rendering. A visitor who wanted
 * to reach us must still be able to, so the fallback carries the direct
 * channels rather than disappearing.
 */
function DemoRequestFallback() {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-x-0 bottom-0 flex justify-center p-4"
      style={{ zIndex: 2147483647 }}
      role="alert"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-ink-900/97 p-5 shadow-2xl backdrop-blur">
        <p className="text-[14px] font-semibold text-fg">{t("demoForm.failure.title")}</p>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-fg-muted">
          {t("demoForm.failure.crashBody")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={DEMO_MESSENGER}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-fg hover:border-white/30"
          >
            {t("demoForm.failure.messenger")}
          </a>
          <a
            href={`mailto:${DEMO_EMAIL}`}
            className="pressable rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-fg hover:border-white/30"
          >
            {t("demoForm.failure.email")}
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="pressable rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-fg hover:border-white/30"
          >
            {t("demoForm.failure.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoRequestProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [preset, setPreset] = React.useState(null);

  const open = React.useCallback((services) => {
    setPreset(Array.isArray(services) && services.length ? services : null);
    setIsOpen(true);
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);

  // isOpen is deliberately not in here: no consumer reads it, and including
  // it re-rendered every MagneticButton on the page on open and on close.
  const value = React.useMemo(() => ({ open, close }), [open, close]);

  return (
    <DemoRequestContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <ErrorBoundary fallback={<DemoRequestFallback />}>
            <DemoRequestDialog isOpen={isOpen} onClose={close} preset={preset} />
          </ErrorBoundary>,
          document.body
        )}
    </DemoRequestContext.Provider>
  );
}

function Chatbot() {
  React.useEffect(() => {
    const container = document.getElementById("dalatech-chatbot-container");
    const btn = document.getElementById("dalatech-chat-toggle");
    if (!container || !btn) return;
    const handleToggle = () => {
      const isHidden = container.style.display === "none" || container.style.display === "";
      container.style.display = isHidden ? "block" : "none";
      btn.style.transform = isHidden ? "scale(1.1) rotate(45deg)" : "scale(1) rotate(0deg)";
    };
    btn.addEventListener("click", handleToggle);
    return () => btn.removeEventListener("click", handleToggle);
  }, []);
  return null;
}

function FooterColumn({ heading, links }) {
  const linkClass = "text-[13.5px] text-fg/85 transition-colors duration-200 hover:text-sky-300";
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted/80">{heading}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.onClick ? (
              <button
                type="button"
                onClick={l.onClick}
                className={linkClass}
                data-cursor="hover"
              >
                {l.label}
              </button>
            ) : l.to ? (
              <Link to={l.to} state={l.state} className={linkClass} data-cursor="hover">
                {l.label}
              </Link>
            ) : (
              <a
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={linkClass}
                data-cursor="hover"
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();

  const goToContact = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("contact");
      if (el) {
        const headerH = window.scrollY > 60 ? 56 : 80;
        const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollTo: "contact" } });
    }
  };

  const services = [
    { label: t("nav.staff"), to: "/office" },
    { label: t("nav.website"), to: "/portfolio" },
    { label: t("nav.pricing"), to: "/pricing" },
  ];
  const company = [
    { label: t("nav.process"), to: "/process" },
    { label: t("nav.location"), to: "/location" },
    { label: t("nav.contact"), onClick: goToContact },
  ];
  const legal = [
    { label: t("footer.privacyPolicy"), href: "/privacy/" },
    { label: t("footer.terms"), href: "/terms/" },
    { label: t("nav.faq"), to: "/faq" },
  ];

  return (
    <footer
      className="relative"
      style={{ borderTop: "1px solid rgba(56,189,248,0.15)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.55) 50%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-32"
        style={{ background: "radial-gradient(50% 100% at 50% 100%, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0) 70%)" }}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={SPRING_REVEAL}
      >
        <Container className="pt-16 pb-10">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <BrandLockup size={40} />
              <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.6] text-fg-muted">
                {t("footer.tagline")}
              </p>
              <div className="mt-6 flex items-center gap-2.5">
                <a
                  href="https://www.facebook.com/profile.php?id=61586065058744"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="DalaTech on Facebook"
                  data-cursor="hover"
                  className="pressable flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-fg-muted transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3V22A10 10 0 0 0 22 12z" />
                  </svg>
                </a>
                <a
                  href="mailto:dalatech.ai@gmail.com"
                  aria-label="Email DalaTech"
                  data-cursor="hover"
                  className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12.5px] font-medium text-fg/85 transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  dalatech.ai@gmail.com
                </a>
              </div>
            </div>
            <FooterColumn heading={t("footer.services")} links={services} />
            <FooterColumn heading={t("footer.company")} links={company} />
            <FooterColumn heading={t("footer.legal")} links={legal} />
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/[0.05] pt-6 sm:flex-row sm:items-center">
            <p className="text-[12.5px] text-fg-muted">
              © {new Date().getFullYear()} DalaTech. {t("footer.rightsReserved")}
            </p>
          </div>
        </Container>
      </motion.div>
    </footer>
  );
}

function LocationBadge() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <section
      id="location"
      aria-label={t("location.eyebrow")}
      className="relative py-16 md:py-28"
    >
      <Container className="relative">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={SPRING_REVEAL}
          className="grid items-center gap-12 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-16"
        >
          <div className="mx-auto w-full max-w-[360px] sm:max-w-[420px] md:mx-0 md:max-w-[480px]">
            <ErrorBoundary fallback={<div className="aspect-square w-full" aria-hidden />}>
              <React.Suspense fallback={<div className="aspect-square w-full" aria-hidden />}>
                <Globe reducedMotion={reduced} />
              </React.Suspense>
            </ErrorBoundary>
          </div>
          <div className="text-center md:text-left">
            <SectionLabel>{t("location.eyebrow")}</SectionLabel>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">
              {t("location.city")}, {t("location.country")}
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-[15.5px] leading-[1.65] text-fg-muted md:mx-0">
              {t("location.tagline")}
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

// The page's one bright moment, and its only contradiction: staff by the
// month, a website once. ink-700 and ink-600 appear nowhere else here. No
// image — the client mock is one section above, and repeating it is exactly
// the repetition this pass is removing. No price either; prices live on
// /pricing. Every row below is lifted verbatim from what that page publishes.
function WebsiteOffer() {
  const { t } = useTranslation();
  const bullets = t("pricing.cards.website.bullets", { returnObjects: true });
  const rows = [...(Array.isArray(bullets) ? bullets : []), t("websiteOffer.delivery")];
  return (
    <section className="py-16 md:py-28">
      <Container>
        <div className="card-glow mx-auto max-w-[780px] rounded-2xl border border-white/10 bg-ink-800/55 px-6 py-10 shadow-card sm:px-10 sm:py-14">
          <h2 className="max-w-[20ch] font-display text-[30px] font-semibold leading-[1.12] tracking-tightest text-fg sm:text-[40px]">
            {t("websiteOffer.title")}
          </h2>
          <p className="mt-5 max-w-[34rem] text-[16px] leading-[1.6] text-fg-muted sm:text-[17px]">
            {t("websiteOffer.lead")}
          </p>
          <ul className="mt-10">
            {rows.map((r) => (
              <li key={r} className="border-t border-white/[0.09] py-4 text-[14.5px] leading-[1.5] text-fg/90">
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <MagneticButton href="https://app.dalatech.online" variant="primary">
              {t("portfolio.createDemo")}
            </MagneticButton>
            <MagneticButton href="#demo" variant="ghost" demoServices={WEBSITE_DEMO_SERVICES}>
              {t("pricing.cards.website.cta")}
            </MagneticButton>
            <Link to="/pricing" className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] text-fg transition-colors hover:text-white">
              {t("websiteOffer.link")}
              <span aria-hidden>&rsaquo;</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

// Every route shipped the same <title> and the same description, so a Google
// result for /pricing and one for /faq were indistinguishable, and a link to
// any page shared on Facebook showed the same card. React 18 has no built-in
// metadata support, so set it directly and put it back on unmount.
const META_TAGS = [
  ["name", "description"],
  ["property", "og:title"],
  ["property", "og:description"],
  ["property", "og:url"],
  ["name", "twitter:title"],
  ["name", "twitter:description"],
  ["name", "twitter:url"],
];

function setMeta(attr, key, value) {
  const el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (el) el.setAttribute("content", value);
}

function usePageMeta(routeKey) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  React.useEffect(() => {
    const base = `meta.${routeKey}`;
    const title = t(`${base}.title`, { defaultValue: "" });
    const desc = t(`${base}.desc`, { defaultValue: "" });
    if (!title) return undefined;

    const prevTitle = document.title;
    const prev = META_TAGS.map(([a, k]) => [a, k, document.head.querySelector(`meta[${a}="${k}"]`)?.getAttribute("content")]);
    const canonicalEl = document.head.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl?.getAttribute("href");
    const url = `https://dalatech.online${pathname === "/" ? "" : pathname}`;

    // The home page is the brand; the rest read "Page · DalaTech".
    document.title = routeKey === "/" ? `DalaTech — ${title}` : `${title} · DalaTech`;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", document.title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", document.title);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:url", url);
    if (canonicalEl) canonicalEl.setAttribute("href", url);
    document.documentElement.setAttribute("lang", i18n.language === "en" ? "en" : "mn");

    return () => {
      document.title = prevTitle;
      for (const [a, k, v] of prev) if (v != null) setMeta(a, k, v);
      if (canonicalEl && prevCanonical) canonicalEl.setAttribute("href", prevCanonical);
    };
  }, [routeKey, pathname, t, i18n.language]);
}

// A `*` route that redirects to `/` tells the visitor nothing and loses the
// address they typed. This says what happened and offers the two pages they
// most likely wanted.
function NotFoundPage() {
  const { t } = useTranslation();
  usePageMeta("404");
  return (
    <PageShell>
      <section className="py-24 md:py-32">
        <Container>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-dim">404</p>
          <h1 className="mt-4 max-w-[18ch] font-display text-[34px] font-semibold leading-[1.1] tracking-tightest text-fg sm:text-[44px]">
            {t("notFound.title")}
          </h1>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.6] text-fg-muted">{t("notFound.body")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4 sm:gap-6">
            <MagneticButton href="/" variant="primary">{t("notFound.home")}</MagneticButton>
            <Link to="/office" className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] text-fg transition-colors hover:text-white">
              {t("notFound.staff")}
              <span aria-hidden>&rsaquo;</span>
            </Link>
          </div>
        </Container>
      </section>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// The homepage. One argument, in the order a buyer asks it: what is this (hero),
// why do I need it (messages at night), how does it work, who is on the staff,
// what about a website, what does it cost, is there a deal, how do we start, is
// my data safe, the rest of my questions, and how do I reach you.
//
// Every price and every line marked approved in PROGRESS.md is copied from
// Дали's own prompt (dalatech-chatbot, api/chat.js), so the page and the chat
// quote the same numbers in the same words. The 21st.dev pieces live in
// src/components/ui/, each with its source and its local changes noted.

const FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61586065058744";

// The «Анхны 10 бизнест» offer's seat counter. It is a real count, not a
// countdown: change it by hand when a business signs, and take the offer down
// at zero. Never animate it below its true value.
const FIRST_TEN_SEATS_LEFT = 10;
const FIRST_TEN_SEATS_TOTAL = 10;

// Monthly fee per staff member in tugrik, as Дали quotes it (null: not announced).
const HOME_MONTHLY = Object.fromEntries(Object.entries(OFFICE_AGENTS).map(([id, a]) => [id, a.monthly]));
const HOME_STAFF = ["dali", "vira", "nova", "ora", "eho"];

// Smooth-scroll to a section on this page, clear of the fixed navbar.
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const y = el.getBoundingClientRect().top + window.scrollY - 64;
  window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
}

function HomeEyebrow({ children, className = "" }) {
  return (
    <p className={["text-[11.5px] font-semibold uppercase tracking-[0.18em] text-accent/90", className].join(" ")}>
      {children}
    </p>
  );
}

function HomeHeader({ eyebrow, title, lead, align = "left", className = "" }) {
  const center = align === "center";
  return (
    <BlurFade inView className={[center ? "mx-auto text-center" : "", "max-w-[720px]", className].join(" ")}>
      <HomeEyebrow>{eyebrow}</HomeEyebrow>
      <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">
        {title}
      </h2>
      {lead && (
        <p className={["mt-5 text-[16px] leading-[1.6] text-fg-muted sm:text-[17px]", center ? "mx-auto max-w-[36rem]" : "max-w-[36rem]"].join(" ")}>
          {lead}
        </p>
      )}
    </BlurFade>
  );
}

// A pixel portrait cropped to the head and shoulders. The atlas frame is 32×64
// with the character standing in its lower half.
// `from` is the first atlas row shown, `rows` how many.
function StaffBust({ id, size = 2, from = 26, rows = 36, className = "" }) {
  return (
    <span
      aria-hidden
      className={["block shrink-0 overflow-hidden", className].join(" ")}
      style={{ width: 32 * size, height: rows * size }}
    >
      <span className="block" style={{ marginTop: -from * size }}>
        <StaffAvatar id={id} size={size} />
      </span>
    </span>
  );
}

// ------------------------------------------------------------------ 1 hero
function HomeHero() {
  const { t } = useTranslation();
  const channels = t("home.hero.channels", { returnObjects: true });
  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-44">
      <Spotlight className="-top-40 left-0 md:-top-24 md:left-40" fill="#60C8FF" />
      {/* the navy under the light: a floor so the page below starts clean */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />

      <Container className="relative z-[2]">
        <div className="mx-auto max-w-[880px] text-center">
          <BlurFade delay={0.05}>
            <HomeEyebrow className="text-fg-muted">{t("home.hero.eyebrow")}</HomeEyebrow>
          </BlurFade>

          <h1 className="mt-6 font-display text-[40px] font-semibold leading-[1.06] tracking-tightest text-fg sm:text-[56px] lg:text-[70px]">
            <span className="sr-only">{t("home.hero.titleA11y")}</span>
            <span aria-hidden className="block text-accent">
              <WordRotate words={Array.isArray(channels) ? channels : []} staticText={t("home.hero.channelsStatic")} duration={2600} />
            </span>
            <span aria-hidden className="block">{t("home.hero.titleAfter")}</span>
          </h1>

          {/* no entrance on the lead: it is the page's largest paint on a
              phone, and fading it in pushed LCP from ~1.0 s to ~2.0 s */}
          <p className="mx-auto mt-7 max-w-[40rem] text-[16px] leading-[1.6] text-fg-muted sm:text-[18px]">
            {t("home.hero.lead")}
          </p>

          <BlurFade delay={0.35}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
              <MagneticButton href="#demo" variant="primary" demoServices={["dali"]} className="w-full sm:w-auto">
                {t("home.hero.primary")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
              <button
                type="button"
                onClick={() => scrollToSection("pricing")}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] text-accent transition-colors hover:text-fg"
              >
                {t("home.hero.secondary")}
                <span aria-hidden>&rsaquo;</span>
              </button>
            </div>
          </BlurFade>

          {/* the one live product, named with its price, under the buttons */}
          <BlurFade delay={0.45}>
            <div className="mx-auto mt-12 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-ink-900/80 py-1.5 pl-1.5 pr-4 text-left">
              <span className="flex h-10 w-10 items-end justify-center overflow-hidden rounded-full bg-accent/10 ring-1 ring-inset ring-accent/25">
                <StaffBust id="dali" size={1} from={24} rows={40} />
              </span>
              <span className="leading-tight">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t("home.hero.daliStatus")}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-fg-muted">{t("home.hero.daliPrice")}</span>
              </span>
            </div>
          </BlurFade>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------- 2 messages at night
function ChannelGlyph({ kind, className = "h-5 w-5" }) {
  if (kind === "messenger") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.53-.04.91.25 1.89.39 2.9.39 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3V22A10 10 0 0 0 22 12z" />
      </svg>
    );
  }
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "website") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </svg>
    );
  }
  // telegram
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.9 4.6 18.8 19.3c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.5-1 .5l.4-4.7 8.5-7.7c.4-.3-.1-.5-.6-.2L7.1 13.3l-4.5-1.4c-1-.3-1-1 .2-1.4L20.5 3.6c.8-.3 1.6.2 1.4 1Z" />
    </svg>
  );
}

function PhoneNote({ icon, from, time, title, children, tone = "default" }) {
  return (
    <div
      className={[
        "rounded-[20px] border px-3.5 py-3 text-left shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]",
        tone === "lead" ? "border-accent/30 bg-ink-800" : "border-white/[0.07] bg-ink-800/90",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium uppercase tracking-[0.08em] text-fg-dim">{from}</p>
        <p className="shrink-0 text-[11.5px] text-fg-dim">{time}</p>
      </div>
      {title && <p className="mt-2 text-[14px] font-semibold leading-[1.35] text-fg">{title}</p>}
      <p className={["text-[14px] leading-[1.45] text-fg/85", title ? "mt-0.5" : "mt-2"].join(" ")}>{children}</p>
    </div>
  );
}

function NightPhone() {
  const { t } = useTranslation();
  const ref = React.useRef(null);
  // Starts once the phone is mostly on screen, then plays through and stays.
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const iconBox = "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]";
  return (
    <div
      ref={ref}
      role="img"
      aria-label={t("home.night.phoneLabel")}
      className="relative mx-auto w-full max-w-[340px] rounded-[48px] border border-white/[0.1] bg-ink-900 p-3 shadow-[0_40px_100px_-40px_rgba(96,200,255,0.28)]"
    >
      <div className="relative h-[590px] overflow-hidden rounded-[38px] bg-gradient-to-b from-ink-800 via-ink-900 to-ink-950 px-3.5">
        <div aria-hidden className="absolute left-1/2 top-3 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-ink-950" />
        <div aria-hidden className="pt-12 text-center">
          <p className="text-[13px] font-medium text-fg-muted">{t("home.night.date")}</p>
          <p className="font-display text-[56px] font-semibold leading-none tracking-tight text-fg/95 tabular-nums">{t("home.night.clock")}</p>
        </div>
        <div aria-hidden className="mt-5">
          <AnimatedList delay={1500} play={inView}>
            <PhoneNote
              key="question"
              icon={<span className={[iconBox, "bg-gradient-to-br from-[#2E8BFF] to-[#A34DFF] text-white"].join(" ")}><ChannelGlyph kind="messenger" className="h-4 w-4" /></span>}
              from={`${t("home.night.channel")} · ${t("home.night.customer")}`}
              time={t("home.night.time")}
            >
              {t("home.night.question")}
            </PhoneNote>
            <PhoneNote
              key="answer"
              icon={<span className={[iconBox, "items-end overflow-hidden bg-accent/15"].join(" ")}><StaffBust id="dali" size={1} from={27} rows={28} /></span>}
              from={`${t("home.night.daliFrom")} → ${t("home.night.customer")}`}
              time={t("home.night.time")}
            >
              {t("home.night.answer")}
            </PhoneNote>
            <PhoneNote
              key="lead"
              tone="lead"
              icon={<span className={[iconBox, "bg-[#2AABEE] text-white"].join(" ")}><ChannelGlyph kind="telegram" className="h-4 w-4" /></span>}
              from={t("home.night.leadFrom")}
              time={t("home.night.now")}
              title={t("home.night.leadTitle")}
            >
              {t("home.night.leadBody")}
            </PhoneNote>
          </AnimatedList>
        </div>
        <div aria-hidden className="absolute bottom-2.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

function HomeNight() {
  const { t } = useTranslation();
  const points = t("home.night.points", { returnObjects: true });
  return (
    <section id="night" className="relative py-20 md:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
          <div>
            <HomeHeader eyebrow={t("home.night.eyebrow")} title={t("home.night.title")} lead={t("home.night.lead")} />
            <BlurFade inView delay={0.1}>
              <ul className="mt-10 max-w-[36rem]">
                {(Array.isArray(points) ? points : []).map((p) => (
                  <li key={p} className="flex gap-3 border-t border-white/[0.07] py-4 text-[15px] leading-[1.5] text-fg/90">
                    <CheckIcon />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </BlurFade>
          </div>
          <div>
            <ErrorBoundary fallback={null}>
              <NightPhone />
            </ErrorBoundary>
            <p className="mt-4 text-center text-[12.5px] text-fg-dim">{t("home.night.note")}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------ 3 how it works
const BEAM_COLORS = { pathColor: "#8B9FC4", pathOpacity: 0.18, gradientStartColor: "#60C8FF", gradientStopColor: "#2563EB" };

function BeamNode({ nodeRef, label, size = "sm", children, highlight = false }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        ref={nodeRef}
        className={[
          "flex items-center justify-center rounded-full border",
          size === "lg" ? "h-[76px] w-[76px] sm:h-[92px] sm:w-[92px]" : "h-12 w-12 sm:h-14 sm:w-14",
          highlight ? "border-accent/40 bg-ink-800 shadow-[0_0_40px_-8px_rgba(96,200,255,0.55)]" : "border-white/10 bg-ink-900 text-fg-muted",
        ].join(" ")}
      >
        {children}
      </div>
      <span className="text-center text-[12px] font-medium leading-tight text-fg-muted sm:text-[13px]">{label}</span>
    </div>
  );
}

function ChannelBeams() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const containerRef = React.useRef(null);
  const fbRef = React.useRef(null);
  const igRef = React.useRef(null);
  const webRef = React.useRef(null);
  const daliRef = React.useRef(null);
  const tgRef = React.useRef(null);
  // The light only runs while the diagram is on screen.
  const inView = useInView(containerRef, { amount: 0.3 });
  const animate = inView && !reduced;
  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={t("home.how.diagramLabel")}
      className="relative mx-auto flex h-[300px] w-full max-w-[760px] items-center justify-between px-1 sm:h-[340px] sm:px-6"
    >
      <div className="flex h-full flex-col justify-between py-2">
        <BeamNode nodeRef={fbRef} label="Facebook"><ChannelGlyph kind="facebook" /></BeamNode>
        <BeamNode nodeRef={igRef} label="Instagram"><ChannelGlyph kind="instagram" /></BeamNode>
        <BeamNode nodeRef={webRef} label={t("home.how.website")}><ChannelGlyph kind="website" /></BeamNode>
      </div>
      <BeamNode nodeRef={daliRef} label={t("home.how.dali")} size="lg" highlight>
        <span className="flex h-full w-full items-end justify-center overflow-hidden rounded-full">
          <StaffBust id="dali" size={2} from={24} rows={40} />
        </span>
      </BeamNode>
      <BeamNode nodeRef={tgRef} label={t("home.how.telegram")}>
        <span className="text-[#2AABEE]"><ChannelGlyph kind="telegram" /></span>
      </BeamNode>

      <AnimatedBeam containerRef={containerRef} fromRef={fbRef} toRef={daliRef} curvature={-40} endYOffset={-10} duration={4} animate={animate} {...BEAM_COLORS} />
      <AnimatedBeam containerRef={containerRef} fromRef={igRef} toRef={daliRef} duration={4} delay={0.6} animate={animate} {...BEAM_COLORS} />
      <AnimatedBeam containerRef={containerRef} fromRef={webRef} toRef={daliRef} curvature={40} endYOffset={10} duration={4} delay={1.2} animate={animate} {...BEAM_COLORS} />
      <AnimatedBeam containerRef={containerRef} fromRef={daliRef} toRef={tgRef} duration={3} delay={2} animate={animate} {...BEAM_COLORS} />
    </div>
  );
}

function HomeHow() {
  const { t } = useTranslation();
  const steps = t("home.how.steps", { returnObjects: true });
  return (
    <section id="how" className="relative py-20 md:py-32">
      <Container>
        <HomeHeader align="center" eyebrow={t("home.how.eyebrow")} title={t("home.how.title")} lead={t("home.how.lead")} />
        <BlurFade inView delay={0.1} className="mt-12 md:mt-16">
          <ErrorBoundary fallback={null}>
            <ChannelBeams />
          </ErrorBoundary>
        </BlurFade>
        <div className="mx-auto mt-10 grid max-w-[980px] gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] md:mt-14 md:grid-cols-3">
          {(Array.isArray(steps) ? steps : []).map((s, i) => (
            <BlurFade key={s.title} inView delay={0.08 * i} className="bg-ink-950 p-6 sm:p-7">
              <p className="font-display text-[13px] font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight text-fg">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-fg-muted">{s.body}</p>
            </BlurFade>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------- 4 AI staff
function StaffStatusPill({ live }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        live ? "bg-accent/12 text-accent ring-1 ring-inset ring-accent/30" : "bg-white/[0.04] text-fg-muted ring-1 ring-inset ring-white/10",
      ].join(" ")}
    >
      <span aria-hidden className={["h-1.5 w-1.5 rounded-full", live ? "bg-accent" : "bg-fg-dim"].join(" ")} />
      {t(live ? "home.staff.live" : "home.staff.soon")}
    </span>
  );
}

function StaffTile({ id }) {
  const { t } = useTranslation();
  const { open } = useDemoRequest();
  const live = STAFF_LIVE[id];
  const p = (k) => t(`home.staff.people.${id}.${k}`);
  const monthly = HOME_MONTHLY[id];

  if (live) {
    const features = t("home.pricing.features.dali", { returnObjects: true });
    // the two lines about nights and limits; the channels are the chips above
    const daliPoints = Array.isArray(features) ? features.slice(1, 3) : [];
    return (
      <BentoCard className="col-span-2 lg:row-span-2">
        <BorderBeam size={260} duration={12} colorFrom="#60C8FF" colorTo="#2563EB" borderWidth={1.5} />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex h-full flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <StaffStatusPill live />
            <StaffBust id={id} size={2} from={24} rows={40} className="-mr-1 -mt-1 sm:hidden" />
          </div>
          <div className="mt-6 flex items-end gap-6">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[40px] font-semibold leading-none tracking-tightest text-fg sm:text-[52px]">{p("name")}</h3>
              <p className="mt-2 text-[16px] text-accent">{p("role")}</p>
            </div>
            <StaffBust id={id} size={4} from={24} rows={40} className="hidden sm:block" />
          </div>
          <p className="mt-5 max-w-[34rem] text-[15.5px] leading-[1.6] text-fg-muted">{p("job")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[["facebook", "Facebook"], ["instagram", "Instagram"], ["website", t("home.how.website")]].map(([kind, label]) => (
              <span key={kind} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-fg/85 ring-1 ring-inset ring-white/[0.08]">
                <ChannelGlyph kind={kind} className="h-3.5 w-3.5 text-fg-muted" />
                {label}
              </span>
            ))}
          </div>
          <ul className="mt-6 hidden max-w-[34rem] space-y-2.5 sm:block">
            {daliPoints.map((line) => (
              <li key={line} className="flex gap-3 text-[14px] leading-[1.5] text-fg/85">
                <CheckIcon />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-5 pt-8 sm:flex-row sm:items-end sm:justify-between">
            <p>
              <span className="font-display text-[30px] font-semibold tracking-tight text-fg tabular-nums">{p("price")}</span>
              <span className="text-[14px] text-fg-muted">{t("home.staff.perMonth")}</span>
              <span className="block text-[13.5px] text-fg-muted">{t("home.staff.setup")}</span>
            </p>
            <MagneticButton href="#demo" variant="primary" demoServices={[id]} className="w-full sm:w-auto">
              {t("home.staff.hire")}
            </MagneticButton>
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard>
      <div className="flex h-full flex-col p-4 md:p-6">
        <div className="flex flex-col-reverse items-start justify-between gap-3 md:flex-row">
          <div className="min-w-0">
            <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg md:text-[22px]">{p("name")}</h3>
            <p className="text-[13.5px] leading-snug text-fg-muted md:text-[14px]">{p("role")}</p>
          </div>
          <span className="flex h-12 w-14 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-white/[0.04] opacity-80">
            <StaffBust id={id} size={2} from={29} rows={24} />
          </span>
        </div>
        {/* a line, not a pill: in a narrow tile the long label wraps cleanly */}
        <p className="mt-3 flex items-start gap-2 text-[12.5px] font-medium leading-[1.4] text-fg-muted">
          <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-fg-dim" />
          {t("home.staff.soon")}
        </p>
        <p className="mt-4 hidden text-[14px] leading-[1.55] text-fg-muted md:block">{p("job")}</p>
        <div className="mt-auto pt-4 md:pt-6">
          {monthly ? (
            <p className="leading-tight">
              <span className="whitespace-nowrap">
                <span className="font-display text-[20px] font-semibold text-fg tabular-nums">{p("price")}</span>
                <span className="text-[13px] text-fg-muted">{t("home.staff.perMonth")}</span>
              </span>
              <span className="block text-[12.5px] text-fg-dim">{t("home.staff.setup")}</span>
            </p>
          ) : (
            <p className="text-[13px] leading-tight text-fg-dim">{t("home.staff.noPrice")}</p>
          )}
          <button
            type="button"
            onClick={() => open([id])}
            className="pressable mt-4 hidden min-h-[44px] w-full items-center justify-center rounded-xl md:inline-flex px-3.5 text-[13.5px] font-semibold text-fg ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/[0.06]"
          >
            {t("home.staff.preregister")}
          </button>
        </div>
      </div>
    </BentoCard>
  );
}

function HomeStaff() {
  const { t } = useTranslation();
  return (
    <section id="staff" className="relative py-20 md:py-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <HomeHeader eyebrow={t("home.staff.eyebrow")} title={t("home.staff.title")} lead={t("home.staff.lead")} />
          <Link to="/office" className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-[16px] text-accent transition-colors hover:text-fg">
            {t("home.staff.more")}
            <span aria-hidden>&rsaquo;</span>
          </Link>
        </div>
        <BlurFade inView delay={0.08} className="mt-12">
          {/* phones get two compact tiles a row for the four to come; what
              each one does is in the price list below, card by card */}
          <BentoGrid className="grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
            {HOME_STAFF.map((id) => <StaffTile key={id} id={id} />)}
          </BentoGrid>
        </BlurFade>
      </Container>
    </section>
  );
}

// ------------------------------------------------------ 5 website + add-ons
function HomeWebsite() {
  const { t } = useTranslation();
  const bullets = t("home.website.bullets", { returnObjects: true });
  const addons = t("home.website.addons", { returnObjects: true });
  return (
    <section id="website" className="relative py-20 md:py-32">
      <Container>
        <HomeHeader eyebrow={t("home.website.eyebrow")} title={t("home.website.title")} lead={t("home.website.lead")} />
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14">
          <BlurFade inView delay={0.05} className="lg:sticky lg:top-28 lg:self-start">
            {/* the client is not named on this site, so the frame is not a link */}
            <Safari url={t("home.website.url")} className="drop-shadow-[0_40px_60px_rgba(2,6,23,0.6)]">
              <SalonPreview />
            </Safari>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>{t("portfolio.case.pills.website")}</Pill>
              <Pill>{t("portfolio.case.pills.chatbot")}</Pill>
              <Pill>{t("portfolio.case.pills.productQA")}</Pill>
              <Pill>{t("portfolio.case.pills.availability")}</Pill>
            </div>
          </BlurFade>

          <BlurFade inView delay={0.12}>
            <div className="rounded-3xl border border-white/[0.08] bg-ink-900 p-6 sm:p-8">
              <h3 className="font-display text-[20px] font-semibold text-fg">{t("home.website.name")}</h3>
              <p className="mt-3 font-display text-[38px] font-semibold leading-none tracking-tight text-fg tabular-nums">{t("home.website.price")}</p>
              <p className="mt-2 text-[14px] text-fg-muted">{t("home.website.priceNote")}</p>
              <ul className="mt-6 space-y-3">
                {(Array.isArray(bullets) ? bullets : []).map((b) => (
                  <li key={b} className="flex gap-3 text-[14.5px] leading-[1.5] text-fg/90">
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-fg-dim">{t("home.website.addonsTitle")}</p>
              <ul className="mt-3">
                {(Array.isArray(addons) ? addons : []).map((a) => (
                  <li key={a.name} className="flex items-baseline justify-between gap-4 border-t border-white/[0.07] py-3 text-[14.5px]">
                    <span className="text-fg/90">{a.name}</span>
                    <span className="font-medium text-fg tabular-nums">{a.price}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-2xl bg-accent/[0.06] px-4 py-3 text-[13.5px] leading-[1.5] text-fg/85 ring-1 ring-inset ring-accent/15">
                {t("home.website.daliNote")}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton href="https://app.dalatech.online" variant="primary" className="w-full sm:w-auto">{t("home.website.demo")}</MagneticButton>
                <MagneticButton href="#demo" variant="ghost" demoServices={WEBSITE_DEMO_SERVICES} className="w-full sm:w-auto">{t("home.website.request")}</MagneticButton>
              </div>
              <p className="mt-4 text-[12.5px] leading-[1.5] text-fg-dim">{t("home.website.demoNote")}</p>
            </div>
          </BlurFade>
        </div>
      </Container>
    </section>
  );
}

// ----------------------------------------------------------------- 6 prices
function TeamDiscount() {
  const { t } = useTranslation();
  const tiers = t("home.pricing.teamTiers", { returnObjects: true });
  const pct = [10, 15, 20];
  return (
    <div className="mt-6 rounded-3xl border border-white/[0.08] bg-ink-900 p-6 sm:p-8">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
        <div>
          <h3 className="font-display text-[20px] font-semibold text-fg">{t("home.pricing.teamTitle")}</h3>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-fg-muted">{t("home.pricing.teamLine")}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {pct.map((n, i) => (
            <div key={n} className="rounded-2xl bg-white/[0.03] px-3 py-4 text-center ring-1 ring-inset ring-white/[0.06]">
              <p className="whitespace-nowrap font-display text-[24px] font-semibold leading-none text-fg sm:text-[36px]">
                −<NumberTicker value={n} className="tracking-tight" />%
              </p>
              <p className="mt-2 text-[12.5px] text-fg-muted">{Array.isArray(tiers) ? tiers[i] : ""}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 border-t border-white/[0.07] pt-4 text-[13.5px] text-fg-muted">{t("home.pricing.noStack")}</p>
    </div>
  );
}

function HomePricing() {
  const { t } = useTranslation();
  const { open } = useDemoRequest();
  const list = (key) => {
    const v = t(key, { returnObjects: true });
    return Array.isArray(v) ? v : [];
  };
  const tiers = HOME_STAFF.map((id) => {
    const live = STAFF_LIVE[id];
    const monthly = HOME_MONTHLY[id];
    return {
      id,
      name: t(`home.staff.people.${id}.name`),
      role: t(`home.staff.people.${id}.role`),
      badge: live ? t("home.pricing.liveBadge") : t("home.pricing.soonBadge"),
      highlight: live,
      className: live ? "md:col-span-2" : "",
      wide: live,
      price: monthly ? { monthly: formatTugrik(monthly), yearly: formatTugrik(monthly * 10) } : null,
      noPrice: t("home.staff.noPrice"),
      setup: monthly ? t("home.pricing.setup") : null,
      yearlyHint: t("home.pricing.yearlyHint"),
      extras: list(`home.pricing.extras.${id}`),
      features: list(`home.pricing.features.${id}`),
      icon: (
        <span className={["flex h-12 w-14 shrink-0 items-end justify-center overflow-hidden rounded-xl", live ? "bg-accent/12" : "bg-white/[0.04] opacity-80"].join(" ")}>
          <StaffBust id={id} size={2} from={29} rows={24} />
        </span>
      ),
      cta: { label: live ? t("home.staff.hire") : t("home.staff.preregister"), onClick: () => open([id]) },
    };
  });
  const terms = t("home.pricing.terms", { returnObjects: true });

  return (
    <section id="pricing" className="relative py-20 md:py-32">
      <Container>
        <HomeHeader align="center" eyebrow={t("home.pricing.eyebrow")} title={t("home.pricing.title")} lead={t("home.pricing.lead")} />
        <BlurFade inView delay={0.08} className="mt-10">
          <PricingSection
            tiers={tiers}
            labels={{
              periodLabel: t("home.pricing.period"),
              monthly: t("home.pricing.monthly"),
              yearly: t("home.pricing.yearly"),
              yearlyNote: t("home.pricing.yearlyNote"),
              perMonth: t("home.pricing.perMonth"),
              perYear: t("home.pricing.perYear"),
            }}
            footer={<TeamDiscount />}
          />
        </BlurFade>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(Array.isArray(terms) ? terms : []).map((term) => (
            <div key={term.title} className="rounded-2xl border border-white/[0.07] p-5">
              <h3 className="text-[14px] font-semibold text-fg">{term.title}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-fg-muted">{term.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ----------------------------------------------------------------- 7 offers
// Gold appears on this page only here.
const GOLD_SHIMMER = { shimmerColor: "#F4D78F", background: "linear-gradient(180deg, #2A2210 0%, #16120A 100%)", borderRadius: "14px" };

function OfferCard({ name, price, items, after, children, cta, onCta }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.07] to-ink-900 p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />
      <h3 className="font-display text-[22px] font-semibold tracking-tight text-gold-300">{name}</h3>
      {price && <p className="mt-3 font-display text-[44px] font-semibold leading-none tracking-tight text-fg tabular-nums">{price}</p>}
      {children}
      <ul className="mt-6 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-[15px] leading-[1.5] text-fg/90">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {after && <p className="mt-5 text-[14px] text-fg-muted">{after}</p>}
      <div className="mt-auto pt-8">
        <ShimmerButton {...GOLD_SHIMMER} onClick={onCta} className="min-h-[50px] w-full border-gold-400/35 text-[15px] font-semibold text-gold-300">
          {cta}
        </ShimmerButton>
      </div>
    </div>
  );
}

function HomeOffers() {
  const { t } = useTranslation();
  const { open } = useDemoRequest();
  const list = (key) => {
    const v = t(key, { returnObjects: true });
    return Array.isArray(v) ? v : [];
  };
  return (
    <section id="offers" className="relative py-20 md:py-28">
      <Container>
        <div className="max-w-[720px]">
          <BlurFade inView>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-gold-400">{t("home.offers.eyebrow")}</p>
            <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px]">{t("home.offers.title")}</h2>
          </BlurFade>
        </div>
        <BlurFade inView delay={0.08} className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          <OfferCard
            name={t("home.offers.bundle.name")}
            price={t("home.offers.bundle.price")}
            items={list("home.offers.bundle.items")}
            after={t("home.offers.bundle.after")}
            cta={t("home.offers.bundle.cta")}
            onCta={() => open(WEBSITE_DALI_DEMO_SERVICES)}
          />
          <OfferCard
            name={t("home.offers.first.name")}
            items={list("home.offers.first.items")}
            cta={t("home.offers.first.cta")}
            onCta={() => open(["dali"])}
          >
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-[44px] font-semibold leading-none text-fg">
                <NumberTicker value={FIRST_TEN_SEATS_LEFT} />
              </span>
              <span className="font-display text-[22px] font-semibold text-fg-muted">{t("home.offers.first.of")}</span>
              <span className="ml-1 text-[14px] text-fg-muted">{t("home.offers.first.seats")}</span>
            </p>
            <div aria-hidden className="mt-4 flex gap-1">
              {Array.from({ length: FIRST_TEN_SEATS_TOTAL }, (_, i) => (
                <span key={i} className={["h-1.5 flex-1 rounded-full", i < FIRST_TEN_SEATS_LEFT ? "bg-gold-400/80" : "bg-white/10"].join(" ")} />
              ))}
            </div>
          </OfferCard>
        </BlurFade>
        <p className="mt-5 text-[13px] text-fg-dim">{t("home.offers.fine")}</p>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- 8 3 steps
function HomeSteps() {
  const { t } = useTranslation();
  const items = t("home.steps.items", { returnObjects: true });
  return (
    <section id="steps" className="relative py-20 md:py-28">
      <Container>
        <HomeHeader eyebrow={t("home.steps.eyebrow")} title={t("home.steps.title")} />
        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          {(Array.isArray(items) ? items : []).map((s, i) => (
            <BlurFade as="li" key={s.title} inView delay={0.08 * i} className="relative border-t border-white/[0.1] pt-6">
              <span aria-hidden className="absolute -top-px left-0 h-px w-12 bg-accent" />
              <p className="font-display text-[44px] font-semibold leading-none text-fg/15 tabular-nums">{i + 1}</p>
              <h3 className="mt-4 font-display text-[20px] font-semibold tracking-tight text-fg">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-fg-muted">{s.body}</p>
            </BlurFade>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// -------------------------------------------------------- 9 data protection
function HomeData() {
  const { t } = useTranslation();
  const items = t("home.data.items", { returnObjects: true });
  return (
    <section id="data" className="relative py-20 md:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <HomeHeader eyebrow={t("home.data.eyebrow")} title={t("home.data.title")} />
            <BlurFade inView delay={0.1} className="mt-10 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
                <p className="font-display text-[40px] font-semibold leading-none text-fg">
                  <NumberTicker value={72} /> <span className="text-[16px] font-medium text-fg-muted">{t("home.data.breachUnit")}</span>
                </p>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-fg-muted">{t("home.data.breach")}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
                <p className="font-display text-[40px] font-semibold leading-none text-fg">
                  <NumberTicker value={30} /> <span className="text-[16px] font-medium text-fg-muted">{t("home.data.deleteUnit")}</span>
                </p>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-fg-muted">{t("home.data.delete")}</p>
              </div>
            </BlurFade>
          </div>
          <BlurFade inView delay={0.12}>
            <ul>
              {(Array.isArray(items) ? items : []).map((it) => (
                <li key={it.title} className="flex gap-4 border-t border-white/[0.07] py-5 first:border-t-0 lg:first:border-t">
                  <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
                    <LockIcon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[15.5px] font-semibold text-fg">{it.title}</span>
                    <span className="mt-1 block text-[14.5px] leading-[1.55] text-fg-muted">{it.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <a href="/privacy/" className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] text-accent transition-colors hover:text-fg">
              {t("home.data.policy")}
              <span aria-hidden>&rsaquo;</span>
            </a>
          </BlurFade>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------- 10 FAQ
function HomeFaq() {
  const { t } = useTranslation();
  const items = t("home.faq.items", { returnObjects: true });
  return (
    <section id="faq" className="relative py-20 md:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <HomeHeader eyebrow={t("home.faq.eyebrow")} title={t("home.faq.title")} />
            <p className="mt-5 max-w-[26rem] text-[14.5px] leading-[1.55] text-fg-muted">{t("home.faq.more")}</p>
          </div>
          <BlurFade inView delay={0.08}>
            <Accordion transition={{ type: "spring", stiffness: 140, bounce: 0, duration: 0.3 }} className="border-b border-white/[0.08]">
              {(Array.isArray(items) ? items : []).map((it, i) => (
                <AccordionItem key={it.q} value={`q${i}`} className="border-t border-white/[0.08]">
                  <AccordionTrigger className="flex min-h-[60px] w-full items-center justify-between gap-6 py-4 text-left text-[15.5px] font-medium text-fg transition-colors hover:text-white sm:text-[16.5px]">
                    <span>{it.q}</span>
                    <span aria-hidden className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-white/15 transition-colors group-data-[expanded]:bg-accent/15 group-data-[expanded]:ring-accent/40">
                      <span className="absolute h-px w-2.5 bg-current" />
                      <span className="absolute h-2.5 w-px bg-current transition-transform duration-200 group-data-[expanded]:scale-y-0" />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="max-w-[40rem] pb-5 pr-10 text-[15px] leading-[1.6] text-fg-muted">{it.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </BlurFade>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------ 11 final call to action
function CtaTile({ href, external, icon, title, note }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="pressable group flex min-h-[44px] items-start gap-4 rounded-2xl border border-white/[0.08] bg-ink-900 p-5 text-left transition-colors hover:border-accent/35 hover:bg-ink-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[16px] font-semibold text-fg">
          {title}
          <span aria-hidden className="text-accent transition-transform duration-200 group-hover:translate-x-0.5">&rsaquo;</span>
        </span>
        <span className="mt-1 block text-[13.5px] leading-[1.5] text-fg-muted">{note}</span>
      </span>
    </a>
  );
}

function HomeCta() {
  const { t } = useTranslation();
  const { open } = useDemoRequest();
  return (
    <section id="contact" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <Container className="relative">
        <HomeHeader align="center" eyebrow="DalaTech" title={t("home.cta.title")} lead={t("home.cta.lead")} />
        <BlurFade inView delay={0.1} className="mx-auto mt-12 grid max-w-[980px] gap-4 md:grid-cols-3">
          <CtaTile href={DEMO_MESSENGER} external icon={<ChannelGlyph kind="messenger" />} title={t("home.cta.messenger")} note={t("home.cta.messengerNote")} />
          <CtaTile href={FACEBOOK_PAGE} external icon={<span className="font-display text-[18px] font-bold">1</span>} title={t("home.cta.comment")} note={t("home.cta.commentNote")} />
          <CtaTile href="https://app.dalatech.online" external icon={<ChannelGlyph kind="website" />} title={t("home.cta.demo")} note={t("home.cta.demoNote")} />
        </BlurFade>
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => open(null)}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[15.5px] text-fg-muted transition-colors hover:text-fg"
          >
            {t("home.cta.request")}
            <span aria-hidden>&rsaquo;</span>
          </button>
        </div>
      </Container>
    </section>
  );
}

const LandingPage = React.memo(function LandingPage() {
  usePageMeta("/");
  return (
    <>
      <HomeHero />
      <HomeNight />
      <HomeHow />
      {/* the live chat demo belongs to "how it works": the same Дали, answering */}
      <LiveDemo />
      <HomeStaff />
      <HomeWebsite />
      <HomePricing />
      <HomeOffers />
      <HomeSteps />
      <HomeData />
      <HomeFaq />
      <HomeCta />
    </>
  );
});

const ProcessPage = React.memo(function ProcessPage() {
  usePageMeta("/process");
  return (
    <PageShell>
      <HowItWorks />
      <ProcessTimeline />
    </PageShell>
  );
});

const LocationPage = React.memo(function LocationPage() {
  usePageMeta("/location");
  return (
    <PageShell>
      <LocationBadge />
    </PageShell>
  );
});

const PortfolioPage = React.memo(function PortfolioPage() {
  usePageMeta("/portfolio");
  return (
    <PageShell>
      <Portfolio />
      <WebsiteOffer />
    </PageShell>
  );
});

const PricingPage = React.memo(function PricingPage() {
  usePageMeta("/pricing");
  return (
    <PageShell>
      <HomePricing />
      <HomeOffers />
    </PageShell>
  );
});

const FAQPage = React.memo(function FAQPage() {
  usePageMeta("/faq");
  return (
    <PageShell>
      <HomeFaq />
    </PageShell>
  );
});

// Pads non-landing pages so content sits below the fixed navbar.

// ---------------------------------------------------------------------------
// /office — four AI staff, drawn in pixel art. One pinned hero where the day
// runs with the scroll, a chapter per person with their real messages floating
// over the scene, a team builder on paper, three steps. The canvas engine
// lives in src/office/pixel.js, the scenes in src/office/scenes.js.

// Only Дали is built. The other four are pre-registration only (founder, 2026-09-25).
const STAFF_LIVE = { dali: true, vira: false, eho: false, nova: false, ora: false };

// Everyone on the payroll. STAFF_ORDER is the four in the pixel room; Ора is
// not in that room — she works for the owner, not their customers, in her own
// interface — so she is appended here rather than added to the scene's cast.
const ALL_STAFF = [...STAFF_ORDER, "ora"];

function useStaffAtlas() {
  const [img, setImg] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    loadStaffAtlas().then(
      (i) => { if (alive) setImg(i); },
      (e) => { if (alive) { console.error(e); setError(e); } }
    );
    return () => { alive = false; };
  }, []);
  return { img, error };
}

/**
 * A canvas that draws one scene from scenes.js. `progress` is a MotionValue
 * (0..1) the scene may read; `scale` is CSS pixels per art pixel for a given
 * width; `minW` keeps the scene's content inside the canvas on narrow screens.
 */
function PixelStage({ draw, logicalH, scale, minW = 64, progress, label, className = "" }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { img, error } = useStaffAtlas();
  const hostRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  // reserve the height the canvas will take, so the page does not jump when the atlas arrives
  const [hostW, setHostW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setHostW(el.clientWidth));
    ro.observe(el);
    setHostW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!img || !canvasRef.current) return undefined;
    let stage;
    try {
      stage = createPixelStage(canvasRef.current, { img, draw, logicalH, scale, minW, reduced: !!reduced });
    } catch (e) {
      console.error(e);
      return undefined;
    }
    let unsubscribe = null;
    if (progress) {
      stage.setProgress(progress.get());
      unsubscribe = progress.on("change", (v) => stage.setProgress(v));
    }
    return () => {
      if (unsubscribe) unsubscribe();
      stage.destroy();
    };
  }, [img, draw, logicalH, scale, minW, progress, reduced]);

  const h = typeof logicalH === "function" ? logicalH(hostW) : logicalH;
  // Reserve exactly what the canvas will occupy. createStage clamps the device
  // scale so the scene still fits the width, then sets the CSS height from that
  // clamped value — so reserving `h * scale(hostW)` over-reserves wherever the
  // clamp bites. At 390 CSS px and dpr 3 that left an 85px band of bare
  // ink-900 under the hero on a phone.
  const reserved = React.useMemo(() => {
    if (!hostW) return undefined;
    const dpr = stageDpr(); // must match createStage, or the reserved height is wrong
    const sDev = Math.max(1, Math.min(Math.round(scale(hostW) * dpr), Math.floor((hostW * dpr) / minW)));
    return (h * sDev) / dpr;
  }, [hostW, h, scale, minW]);

  return (
    <div ref={hostRef} className={["relative flex items-center justify-center overflow-hidden bg-ink-900", className].join(" ")} style={{ minHeight: reserved }}>
      {error ? (
        <p className="px-6 py-10 text-center text-[13px] text-fg-muted">{t("office.unavailable")}</p>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={label} className="block" style={{ imageRendering: "pixelated" }} />
      )}
    </div>
  );
}

// Scroll progress through an element, smoothed so the motion trails the
// finger a little; reduced motion reads the raw value so nothing lags.
const CHAPTER_SPRING = { stiffness: 90, damping: 26, mass: 0.6, restDelta: 0.0005 };

function useDampedProgress(ref, offset, spring = CHAPTER_SPRING) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smooth = useSpring(scrollYProgress, spring);
  return reduced ? scrollYProgress : smooth;
}

// One scale and one height, deliberately not branched on width. The stage
// measures its own frame, and the chapter frame is not monotonic in viewport
// width: below md the scene is full width, at md it becomes seven columns of
// twelve and shrinks. A width branch therefore made the room jump taller
// between 696 and 767 pixels of window and snap back again.
//
// The room needs the height to read as a room: a wall tall enough to carry a
// full window bay, a band under it, and a floor deep enough to stand on.
const CHAPTER_SCALE = () => 2;
const CHAPTER_HEIGHT = () => 214;

function StaffStatus({ live }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
      <span className={["h-1.5 w-1.5 rounded-full", live ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" : "bg-fg-dim/70"].join(" ")} aria-hidden />
      {live ? t("office.status.live") : t("office.status.soon")}
    </span>
  );
}

// ----------------------------------------------- the office page's own opening
// Not the landing page's clock, and not a second telling of the four chapters
// further down. The argument here is a different one: the work a business gets
// is four different kinds, and each of the four takes one kind. Two lanes run
// inward — a message, a call. One never leaves the desk: the numbers. One goes
// out on its own and comes back with an answer.
//
// Every element is authored at its finished position. The animation is added
// only once the board is on screen and only when motion is welcome, and it
// runs *from* the start state via animation-fill-mode: backwards. So the board
// is true with the animation off, blocked, or never started — it is a diagram
// that happens to move, not a sequence you have to catch.
// The lanes are also the way in to the chapters, so this board and the four
// chapters are now the only two tellings of the four on the page — a separate
// grid of cards used to sit directly beneath it saying the same four names,
// which is the one thing a reader could not unsee. Same order as the chapters
// and the pricing page. The direction is carried by the rails and the chips,
// which is where it belongs, not by the sequence.
// "owner": the fifth lane runs from the far end and back like Нова's, but the
// party at the far end is the owner, not a customer — a document comes in
// from them and goes back to them reviewed.
const BOARD_DIR = { dali: "in", eho: "in", vira: "still", nova: "out", ora: "owner" };

// Each lane's payload, drawn small enough to sit on a 28px rail. The glyph is
// the job: a message, a ringing call, four weeks of numbers, a note going out.
function BoardGlyph({ kind }) {
  if (kind === "chat") {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
        <path d="M3.2 4.6h13.6v8.2H8.4L4.6 15.8v-3h-1.4z" fill="currentColor" opacity="0.22" />
        <path d="M3.2 4.6h13.6v8.2H8.4L4.6 15.8v-3h-1.4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "call") {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
        <path d="M6.6 3.6 8.4 7l-1.7 1.6a9 9 0 0 0 4.7 4.7L13 11.6l3.4 1.8-.5 2.6a1.4 1.4 0 0 1-1.5 1.1C8 16.6 3.4 12 2.9 5.6a1.4 1.4 0 0 1 1.1-1.5z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "send") {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
        <path d="M17 3 2.6 8.6l5.5 2.1 2.1 5.5z" fill="currentColor" opacity="0.28" />
        <path d="M17 3 2.6 8.6l5.5 2.1 2.1 5.5zM17 3l-8.9 7.7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "doc") {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
        <path d="M5.5 2.8h6l3.5 3.5v10.9h-9.5z" fill="currentColor" opacity="0.22" />
        <path d="M5.5 2.8h6l3.5 3.5v10.9h-9.5zM11.5 2.8v3.5H15M8 10h4.5M8 13h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  // the document going home, marked
  if (kind === "docDone") {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
        <path d="M5.5 2.8h6l3.5 3.5v10.9h-9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M11.5 2.8v3.5H15" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M7.6 12.2l1.9 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // the answer that comes back
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path d="M3.6 10.6 7.6 14.4 16.4 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BOARD_BARS = [0.46, 0.64, 0.5, 1]; // four weeks; the last one is the point

function BoardLane({ id, dir, step, onPick, onEnter }) {
  const { t } = useTranslation();
  const live = STAFF_LIVE[id];
  return (
    <li className="board-cell">
      {/* The lane is the way in to this agent's chapter. It used to be an inert
          diagram sitting directly above a grid of four cards that said the same
          four names — one of the two had to carry both jobs, and the lane is
          the one that also makes an argument.
          data-d carries the lane's place in the opening cascade, so a replay of
          this lane on its own can set --d to zero and answer the pointer at
          once instead of a beat later. */}
      <button
        type="button"
        onClick={() => onPick(id)}
        onMouseEnter={onEnter}
        data-cursor="hover"
        className="board-lane pressable"
        data-dir={dir}
        data-soon={live ? undefined : "true"}
        data-d={`${240 + step * 260}ms`}
        style={{ "--d": `${240 + step * 260}ms` }}
      >
        <div className="board-who">
          {/* the same pixel face as the scenes below: four people, not four bars */}
          <span className="board-face">
            <StaffAvatar id={id} size={2} className="-mt-[60px]" />
          </span>
          <span className="min-w-0">
            <span className="board-name">
              {t(`office.agents.${id}.name`)}
              {!live && <span className="board-soon">{t("office.status.soon")}</span>}
            </span>
            <span className="board-role">{t(`office.agents.${id}.role`)}</span>
            {/* everything that carries the direction is drawn, so a screen
                reader would otherwise hear a name and a channel and no verb */}
            <span className="sr-only">{t(`office.board.lanes.${id}.dir`)}</span>
          </span>
        </div>

        <div className="board-rail">
          <span className="board-track" aria-hidden />
          {dir !== "still" && <span className="board-arrow" aria-hidden />}
          {/* the outbound lane is the only round trip: out, then back */}
          {dir === "out" && <span className="board-arrow board-arrow--back" aria-hidden />}

          {dir === "in" && (
            <span className="board-slide board-slide--in" aria-hidden>
              <span className="board-token">
                <BoardGlyph kind={id === "eho" ? "call" : "chat"} />
                {id === "eho" && <span className="board-ripple" />}
              </span>
            </span>
          )}

          {dir === "still" && (
            <span className="board-bars" aria-hidden>
              {BOARD_BARS.map((h, i) => (
                <span key={i} className="board-bar" style={{ "--h": `${Math.round(h * 100)}%`, "--i": i }} />
              ))}
            </span>
          )}

          {dir === "out" && (
            <>
              <span className="board-slide board-slide--out" aria-hidden>
                <span className="board-token board-token--ghost"><BoardGlyph kind="send" /></span>
              </span>
              <span className="board-slide board-slide--back" aria-hidden>
                <span className="board-token board-token--reply"><BoardGlyph kind="tick" /></span>
              </span>
            </>
          )}

          {/* the incoming document is a ghost for the same reason Нова's note
              is: once the reviewed one has gone home, it no longer exists */}
          {dir === "owner" && (
            <>
              <span className="board-slide board-slide--owner-in" aria-hidden>
                <span className="board-token board-token--ghost"><BoardGlyph kind="doc" /></span>
              </span>
              <span className="board-slide board-slide--owner-back" aria-hidden>
                <span className="board-token board-token--reply"><BoardGlyph kind="docDone" /></span>
              </span>
            </>
          )}
        </div>

        <div className="board-end">
          <span className="board-chip">{t(`office.board.lanes.${id}.end`)}</span>
          {OFFICE_AGENTS[id].monthly != null && (
            <span className="board-price">
              {formatTugrik(OFFICE_AGENTS[id].monthly)}
              <span className="board-per">{t("office.price.perMonth")}</span>
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function ShiftBoard({ onPick, className = "" }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const ref = React.useRef(null);

  // Restarting a CSS animation means taking the attribute away, letting the
  // browser settle, and putting it back — done on the node rather than through
  // state so a replay never re-renders a lane mid-flight. The attribute is on
  // the lane, not on the board, so one lane runs without disturbing the other
  // three. `solo` drops the cascade delay: a replay asked for by a pointer
  // should start under it, not a beat later.
  const run = React.useCallback((el, solo) => {
    if (!el) return;
    el.style.setProperty("--d", solo ? "0ms" : el.dataset.d || "0ms");
    el.removeAttribute("data-run");
    void el.offsetWidth; // forces the cancelled animations to be committed
    el.setAttribute("data-run", "on");
  }, []);

  React.useEffect(() => {
    if (reduced || !ref.current) return undefined;
    // One observer entry per lane. On a phone there is no hover and the tap is
    // already spent opening the agent's chapter, so a lane arriving on screen
    // is the per-lane trigger there — the board is taller than the fold, so
    // they do arrive one at a time. The first time a lane appears it keeps its
    // place in the cascade; coming back it runs on its own.
    const played = new WeakSet();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        run(e.target, played.has(e.target));
        played.add(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    ref.current.querySelectorAll(".board-lane").forEach((l) => io.observe(l));
    return () => io.disconnect();
  }, [reduced, run]);

  // Only where a pointer can actually hover: on a touch screen the browser
  // synthesises mouseenter on tap, which would replay a lane on the way out
  // to the chapter.
  const onEnter = React.useCallback((e) => {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    run(e.currentTarget, true);
  }, [reduced, run]);

  return (
    <div ref={ref} className={["w-full", className].join(" ")}>
      <ul role="list" className="board-lanes" aria-label={t("office.board.label")}>
        {STAFF_ORDER.map((id, i) => (
          <BoardLane key={id} id={id} dir={BOARD_DIR[id]} step={i} onPick={onPick} onEnter={onEnter} />
        ))}
        {/* the split the board makes: four lanes on the customer's side, one on the owner's */}
        {/* aria-hidden: the split is already spoken by Ора's lane (its sr-only direction) and the caption */}
        <li className="board-divider" aria-hidden="true">{t("office.board.owner")}</li>
        <BoardLane id="ora" dir={BOARD_DIR.ora} step={STAFF_ORDER.length} onPick={onPick} onEnter={onEnter} />
      </ul>
      <p className="mx-auto mt-5 max-w-[540px] text-center text-[13px] leading-[1.5] text-fg-muted">
        {t("office.board.caption")}
      </p>
    </div>
  );
}

function StaffHero({ onHire, onSee, onPick }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden pb-6 pt-[96px] md:pb-10 md:pt-[124px]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute right-[-12%] top-[4%] h-[34rem] w-[34rem] rounded-full lg:right-[1%]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(37,99,235,0.05) 42%, rgba(56,189,248,0) 70%)", filter: "blur(40px)" }}
        />
      </div>
      <Container className="relative">
        <div className="mx-auto max-w-[760px] text-center">
          <div>
            <SectionLabel>{t("office.section")}</SectionLabel>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_HEADLINE}
              className="mt-4 font-display text-[38px] font-semibold leading-[1.06] tracking-tightest text-fg sm:text-[50px] md:text-[56px]"
            >
              {t("office.hero.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_REVEAL, delay: 0.08 }}
              className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[1.5] text-fg-muted"
            >
              {t("office.hero.lead")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_REVEAL, delay: 0.16 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            >
              <MagneticButton onClick={onHire} variant="primary" className="min-h-[44px]">{t("office.hero.hire")}</MagneticButton>
              <button type="button" onClick={onSee} data-cursor="hover" className="pressable inline-flex min-h-[44px] items-center gap-1 text-[17px] text-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-md px-1">
                {t("office.hero.see")} <span aria-hidden>›</span>
              </button>
            </motion.div>
          </div>

        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_REVEAL, delay: 0.22 }}
          className="mx-auto mt-10 max-w-[740px] md:mt-12"
        >
          <ErrorBoundary fallback={null}>
            <ShiftBoard onPick={onPick} />
          </ErrorBoundary>
        </motion.div>
      </Container>
    </section>
  );
}

function StaffPrice({ id, align = "left" }) {
  const { t } = useTranslation();
  const a = OFFICE_AGENTS[id];
  if (a.monthly == null) {
    return (
      <div className={align === "center" ? "text-center" : ""}>
        <p className="text-[15px] font-medium text-fg-muted">{t("home.staff.noPrice")}</p>
      </div>
    );
  }
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="font-display text-[22px] font-semibold tracking-tight text-fg">
        {formatTugrik(a.monthly)}
        <span className="text-[14px] font-normal text-fg-muted">{t("office.price.perMonth")}</span>
      </p>
      <p className="mt-1 text-[13px] text-fg-muted">{t("office.price.setup", { price: formatTugrik(a.setup) })}</p>
    </div>
  );
}

// A chat as the customer sees it in Messenger. The time is shown once per
// exchange, beside the bubble that opens it, never as a log under each line.
function StaffChat({ lines, step }) {
  return (
    <CueGroup as="ol" step={step} className="flex flex-col gap-2" role="list">
      {lines.map((m, i) => {
        const mine = m.from === "staff";
        const stamp = i === 0 || m.time !== lines[i - 1].time ? m.time : null;
        return (
          <CueItem
            as="li"
            key={i}
            className={["flex max-w-[94%] items-end gap-1.5", mine ? "flex-row-reverse self-end" : "self-start"].join(" ")}
          >
            <span
              className={[
                "rounded-[16px] px-3 py-2 text-[13px] leading-[1.42] shadow-[0_2px_10px_rgba(0,0,0,0.25)] sm:text-[14px]",
                mine ? "rounded-br-[5px] bg-brand-500 text-white" : "rounded-bl-[5px] bg-[#1C2547] text-fg",
              ].join(" ")}
            >
              {m.text}
            </span>
            {stamp && <span className="mb-1 shrink-0 text-[11px] tabular-nums text-fg-muted">{stamp}</span>}
          </CueItem>
        );
      })}
    </CueGroup>
  );
}

// Вира's report. Her screen has its back to the room now, so this card is
// where the four bars are actually read; they build in turn on the card's own
// clock rather than as the page scrolls.
function StaffReport({ report }) {
  const last = report.values.length - 1;
  return (
    <Reveal y={10} className="rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 p-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-dim">{report.tag}</p>
      <p className="mt-1 text-[13px] font-semibold text-fg">{report.title}</p>
      <CueGroup className="mt-3 flex h-[72px] items-end gap-2" step={170} lead={400} aria-hidden>
        {report.values.map((v, i) => (
          <CueItem
            key={i}
            variants={BAR_GROW}
            style={{ height: `${v * 100}%` }}
            className={["flex-1 origin-bottom rounded-t-[3px]", i === last ? "bg-sky-400" : "bg-brand-500/70"].join(" ")}
          />
        ))}
      </CueGroup>
      <div className="mt-1 grid grid-cols-4 gap-2 text-[10px] text-fg-dim">
        {report.weeks.map((w) => <span key={w} className="truncate text-center">{w}</span>)}
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.45] text-fg/85">{report.insight}</p>
    </Reveal>
  );
}

// Эхо's call: incoming, answered, the first line. Three beats arriving in
// turn, the way a call goes, rather than as fast as the page is scrolled.
function StaffCall({ call, step }) {
  const reduced = useReducedMotion();
  return (
    <CueGroup className="flex flex-col gap-2" step={step}>
      <CueItem className="flex items-center gap-3 rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 px-3.5 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-400" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-fg">{call.incoming}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-fg-muted">18:05</span>
      </CueItem>
      <CueItem className="flex items-center gap-3 rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 px-3.5 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        <span className="flex h-9 w-9 shrink-0 items-end justify-center gap-[3px] rounded-full bg-sky-400/15 pb-[11px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={["w-[3px] rounded-full bg-sky-400", reduced ? "" : "animate-[staffWave_1.1s_ease-in-out_infinite]"].join(" ")}
              style={{ height: 6 + (i % 2) * 6, animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-fg">{call.answered}</span>
          <span className="block text-[12px] text-fg-muted">{call.after}</span>
        </span>
      </CueItem>
      <CueItem className="self-end">
        <p className="max-w-[92%] rounded-[16px] rounded-br-[5px] bg-brand-500 px-3 py-2 text-[13px] leading-[1.42] text-white shadow-[0_2px_10px_rgba(0,0,0,0.25)] sm:text-[14px]">{call.line}</p>
      </CueItem>
    </CueGroup>
  );
}

function StaffChapter({ id, index, onHire }) {
  const { t } = useTranslation();
  const ref = React.useRef(null);
  const progress = useDampedProgress(ref, ["start end", "end start"]);
  const draw = React.useMemo(() => drawStaffChapter(id), [id]);
  const live = STAFF_LIVE[id];
  const base = `office.chapters.${id}`;
  const flip = index % 2 === 1;

  let overlay = null;
  if (id === "vira") overlay = <StaffReport report={t(`${base}.report`, { returnObjects: true })} />;
  else if (id === "eho") overlay = <StaffCall call={t(`${base}.call`, { returnObjects: true })} />;
  else overlay = <StaffChat lines={t(`${base}.chat`, { returnObjects: true })} />;

  return (
    <section ref={ref} id={`staff-${id}`} className="py-14 md:py-24">
      <Container>
        {/* The copy sits on the page, not in a container of its own: the claim
            above the scene's eye line, the reason and the price below it. The
            only thing that belongs inside the room is what the person in it is
            sending. */}
        <div className="grid gap-6 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-10 md:gap-y-4">
          <Reveal className={["md:col-span-5 md:row-start-1 md:self-end", flip ? "md:col-start-8" : "md:col-start-1"].join(" ")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SectionLabel>{t(`${base}.eyebrow`)}</SectionLabel>
              <StaffStatus live={live} />
            </div>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[40px] md:text-[46px]">{t(`${base}.title`)}</h2>
          </Reveal>
          <div className={["md:col-span-7 md:row-span-2 md:row-start-1 md:self-center", flip ? "md:col-start-1" : "md:col-start-6"].join(" ")}>
            <div className="relative -mx-5 sm:mx-0">
              <PixelStage
                draw={draw}
                logicalH={CHAPTER_HEIGHT}
                scale={CHAPTER_SCALE}
                minW={150}
                progress={progress}
                label={t(`${base}.sceneAlt`)}
                className="sm:rounded-[24px] sm:border sm:border-white/[0.08]"
              />
              {/* what is really on the screen, floated over the quiet half of the wall */}
              <div className="absolute left-[49%] right-[4%] top-[4%] sm:left-[50%]">{overlay}</div>
            </div>
          </div>
          <Reveal className={["md:col-span-5 md:row-start-2 md:self-start", flip ? "md:col-start-8" : "md:col-start-1"].join(" ")}>
            <p className="max-w-[460px] text-[17px] leading-[1.47] text-fg-muted">{t(`${base}.body`)}</p>
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <StaffPrice id={id} />
              <div className="mt-5">
                <MagneticButton onClick={() => onHire([id])} variant={live ? "primary" : "secondary"} className="min-h-[44px]">
                  {t(`${base}.cta`)}
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Ора
// The four are shown from the customer's side: a room you look into, a phone
// that receives their messages. Ора is the other way round, and the room says
// it before the copy does. The four sit along a wall of glass on the customer
// floor; her room has no glass in it at all. What the owner hands her stays in
// a closed room, which is most of the reason to hire her.
//
// Her chat floats over that room the way the message, the report and the call
// float over the other four: it is her own interface rather than Messenger,
// and it is where the range of her work is visible in one glance.

function LockIcon({ className = "" }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// Her chat, as the owner sees it: a titled window rather than a bare thread,
// because whose window it is happens to be the point.
function OraPanel({ panel, step }) {
  const lines = Array.isArray(panel.lines) ? panel.lines : [];
  return (
    <Reveal y={10} className="overflow-hidden rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
        <span className="text-[12px] font-semibold tracking-tight text-fg">{panel.window}</span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted">
          <LockIcon />
          {panel.private}
        </span>
      </div>
      <CueGroup as="ol" step={step} className="flex flex-col gap-2 px-3 pb-3 pt-2.5" role="list">
        {lines.map((m, i) => {
          const mine = m.from === "ora";
          return (
            <CueItem as="li" key={i} className={["flex max-w-[94%]", mine ? "self-start" : "self-end"].join(" ")}>
              <span
                className={[
                  "rounded-[14px] px-3 py-2 text-[12.5px] leading-[1.42] shadow-[0_2px_10px_rgba(0,0,0,0.25)] sm:text-[13.5px]",
                  mine ? "rounded-bl-[5px] bg-[#1C2547] text-fg" : "rounded-br-[5px] bg-brand-500 text-white",
                ].join(" ")}
              >
                {m.text}
              </span>
            </CueItem>
          );
        })}
      </CueGroup>
    </Reveal>
  );
}

// The one sentence the page needs between the four and the fifth.
function OraIntro() {
  const { t } = useTranslation();
  return (
    <section className="pb-2 pt-16 md:pt-24">
      <Container>
        <Reveal className="mx-auto max-w-[680px] border-t border-white/[0.08] pt-10 text-center md:pt-14">
          <SectionLabel>{t("office.chapters.oraIntro.eyebrow")}</SectionLabel>
          <h2 className="mt-4 font-display text-[30px] font-semibold leading-[1.1] tracking-tightest text-fg sm:text-[38px] md:text-[44px]">{t("office.chapters.oraIntro.title")}</h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-[1.55] text-fg-muted sm:text-[17px]">{t("office.chapters.oraIntro.lead")}</p>
        </Reveal>
      </Container>
    </section>
  );
}

// What she actually takes on, as work rather than as features. Six blocks:
// five kinds of work, and the condition all five are done under.
function OraDoes({ items }) {
  return (
    <StaggerGroup className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
      {items.map((d) => (
        <StaggerItem key={d.title}>
          <h3 className="flex items-center gap-2 text-[15.5px] font-semibold tracking-tight text-fg">
            {d.locked && <span className="text-sky-400"><LockIcon /></span>}
            {d.title}
          </h3>
          <p className="mt-2 text-[14.5px] leading-[1.52] text-fg-muted">{d.text}</p>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

function OraChapter({ onHire }) {
  const { t } = useTranslation();
  const ref = React.useRef(null);
  const progress = useDampedProgress(ref, ["start end", "end start"]);
  const draw = React.useMemo(() => drawOraRoom(), []);
  const id = "ora";
  const base = `office.chapters.${id}`;
  const live = STAFF_LIVE[id];
  const panel = t(`${base}.panel`, { returnObjects: true });
  const does = t(`${base}.does`, { returnObjects: true });

  return (
    <section ref={ref} id={`staff-${id}`} className="py-14 md:py-24">
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-10 md:gap-y-4">
          <Reveal className="md:col-span-5 md:col-start-1 md:row-start-1 md:self-end">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SectionLabel>{t(`${base}.eyebrow`)}</SectionLabel>
              <StaffStatus live={live} />
            </div>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[40px] md:text-[46px]">{t(`${base}.title`)}</h2>
          </Reveal>
          <div className="md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 md:self-center">
            <div className="relative -mx-5 sm:mx-0">
              {/* Only the canvas is wrapped. The section carries her name, her
                  price and the request button, so a stage that throws has to
                  cost a picture, never the fifth member of staff. */}
              <ErrorBoundary fallback={null}>
                <PixelStage
                  draw={draw}
                  logicalH={CHAPTER_HEIGHT}
                  scale={CHAPTER_SCALE}
                  minW={150}
                  progress={progress}
                  label={t(`${base}.sceneAlt`)}
                  className="sm:rounded-[24px] sm:border sm:border-white/[0.08]"
                />
              </ErrorBoundary>
              <div className="absolute left-[49%] right-[4%] top-[4%] sm:left-[50%]">
                <OraPanel panel={panel} />
              </div>
            </div>
          </div>
          <Reveal className="md:col-span-5 md:col-start-1 md:row-start-2 md:self-start">
            <p className="max-w-[460px] text-[17px] leading-[1.47] text-fg-muted">{t(`${base}.body`)}</p>
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <StaffPrice id={id} />
              <div className="mt-5">
                <MagneticButton onClick={() => onHire([id])} variant={live ? "primary" : "secondary"} className="min-h-[44px]">
                  {t(`${base}.cta`)}
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
        {Array.isArray(does) && <OraDoes items={does} />}
      </Container>
    </section>
  );
}

// A pixel portrait cut from the atlas with CSS, idling in six frames.
function StaffAvatar({ id, size = 2, className = "" }) {
  // One still frame. The portraits used to step through the idle strip, which
  // read as bobbing on a card; the pixel scenes carry the motion instead.
  const a = STAFF_CHARS[id].idle;
  return (
    <span
      aria-hidden
      className={["block shrink-0 overflow-hidden", className].join(" ")}
      style={{
        width: a.w * size,
        height: a.h * size,
        backgroundImage: `url(${STAFF_ATLAS.url})`,
        backgroundSize: `${STAFF_ATLAS.w * size}px ${STAFF_ATLAS.h * size}px`,
        backgroundPosition: "var(--staff-x) var(--staff-y)",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        "--staff-x": `-${a.x * size}px`,
        "--staff-y": `-${a.y * size}px`,
      }}
    />
  );
}

function StaffTeam({ onHire }) {
  const { t } = useTranslation();
  const [picked, setPicked] = React.useState(() => new Set(["dali"]));
  const ids = ALL_STAFF;
  const toggle = (id) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const chosen = ids.filter((id) => picked.has(id));
  // Only priced staff are summed and counted for the team discount: Эхо has no
  // announced price, so a total "with Эхо" would be a number nobody approved.
  const priced = chosen.filter((id) => OFFICE_AGENTS[id].monthly != null);
  const bundle = OFFICE_BUNDLES.find((b) => b.agents === priced.length);
  const discount = bundle ? bundle.discount : 0;
  const monthlyFull = priced.reduce((s, id) => s + OFFICE_AGENTS[id].monthly, 0);
  const monthly = Math.round(monthlyFull * (1 - discount));
  const setup = priced.reduce((s, id) => s + OFFICE_AGENTS[id].setup, 0);
  const anyLive = chosen.some((id) => STAFF_LIVE[id]);
  const blocked = chosen.length === 0;

  return (
    <section id="team" className="py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-[980px]">
          <Reveal className="text-center">
            <SectionLabel>{t("office.team.eyebrow")}</SectionLabel>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">{t("office.team.title")}</h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.47] text-fg-muted">{t("office.team.description")}</p>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" role="group" aria-label={t("office.team.pick")}>
            {ids.map((id) => {
              const on = picked.has(id);
              const a = OFFICE_AGENTS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={on}
                  data-cursor="hover"
                  className={[
                    "pressable flex min-h-[44px] items-center gap-3 rounded-[18px] border bg-white/[0.03] p-3 text-left transition-[border-color,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 md:flex-col md:items-start md:gap-2 md:p-4",
                    on ? "border-sky-400/80 shadow-[0_0_0_1px_rgba(56,189,248,0.6),0_16px_40px_-24px_rgba(56,189,248,0.5)]" : "border-white/[0.08] hover:border-white/[0.22]",
                  ].join(" ")}
                >
                  <span className="flex h-[64px] w-[64px] shrink-0 items-start justify-center overflow-hidden rounded-[12px] bg-white/[0.06]">
                    <StaffAvatar id={id} size={2} className="-mt-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-[17px] font-semibold tracking-tight text-fg">{t(`office.agents.${id}.name`)}</span>
                      <span className={["h-4 w-4 shrink-0 rounded-full border transition-colors", on ? "border-sky-400 bg-sky-400" : "border-white/25 bg-transparent"].join(" ")} aria-hidden>
                        {on && <svg viewBox="0 0 16 16" className="h-full w-full text-ink-950"><path d="M4 8.3l2.6 2.6L12 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                    </span>
                    <span className="block text-[12px] text-fg-muted">{t(`office.agents.${id}.role`)}{!STAFF_LIVE[id] && <> · {t("office.status.soon")}</>}</span>
                    {a.monthly != null ? (
                      <span className="mt-1 block text-[13px] font-medium tabular-nums text-fg">{formatTugrik(a.monthly)}<span className="font-normal text-fg-muted">{t("office.price.perMonth")}</span></span>
                    ) : (
                      <span className="mt-1 block text-[12px] text-fg-muted">{t("home.staff.noPrice")}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-4 sm:block">
                <dt className="text-[13px] text-fg-muted">{t("office.team.monthly")}</dt>
                <dd className="text-right sm:mt-1 sm:text-left">
                  <span className="font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-fg">{formatTugrik(priced.length ? monthly : 0)}</span>
                  <span className="text-[14px] text-fg-muted">{t("office.price.perMonth")}</span>
                  {discount > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-[13px] tabular-nums text-fg-muted">
                      <s>{formatTugrik(monthlyFull)}</s>
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">{t("office.team.discount", { percent: Math.round(discount * 100) })}</span>
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 sm:block">
                <dt className="text-[13px] text-fg-muted">{t("office.team.setup")}</dt>
                <dd className="text-right font-display text-[22px] font-semibold tracking-tight tabular-nums text-fg sm:mt-1 sm:text-left">{formatTugrik(setup)}</dd>
              </div>
            </dl>
            <div className="mt-4 min-h-[20px] text-[12.5px] leading-[1.5] text-fg-muted" aria-live="polite">
              {chosen.length === 0 && <p>{t("office.team.empty")}</p>}
              {!blocked && picked.has("eho") && <p>{t("office.team.ehoNoPrice")}</p>}
              {!blocked && picked.has("ora") && <p>{t("office.team.ownerNote")}</p>}
              {!blocked && chosen.some((id) => !STAFF_LIVE[id]) && <p>{t("office.team.soonNote")}</p>}
            </div>
            <button
              type="button"
              disabled={blocked}
              onClick={() => onHire(chosen)}
              data-cursor="hover"
              className="pressable mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-fg px-5 py-3 text-[15px] font-semibold tracking-tight text-ink-950 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {anyLive ? t("office.team.cta") : t("office.team.ctaPreorder")}
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function StaffSteps() {
  const { t } = useTranslation();
  const items = t("office.steps.items", { returnObjects: true });
  return (
    <section className="py-16 md:py-24">
      <Container>
        <Reveal className="text-center">
          <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-tightest text-fg sm:text-[36px]">{t("office.steps.title")}</h2>
        </Reveal>
        <StaggerGroup className="mx-auto mt-10 grid max-w-[900px] gap-6 sm:grid-cols-3">
          {items.map((s, i) => (
            <StaggerItem key={i}>
              <div className="border-t border-white/[0.1] pt-5">
                <p className="font-display text-[13px] font-semibold tabular-nums text-fg-dim">0{i + 1}</p>
                <p className="mt-2 font-display text-[18px] font-semibold tracking-tight text-fg">{s.title}</p>
                <p className="mt-1.5 text-[15px] leading-[1.5] text-fg-muted">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}

// The question a sceptical owner actually has is not what it can do — the
// page has just spent four chapters on that — but what it will do when it
// does not know. Every line here restates something the FAQ already
// publishes; nothing is a new promise.
function StaffLimits() {
  const { t } = useTranslation();
  const items = t("office.limits.items", { returnObjects: true });
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] px-6 py-10 sm:px-10 sm:py-12">
          <h2 className="max-w-[20ch] font-display text-[26px] font-semibold leading-[1.15] tracking-tightest text-fg sm:text-[32px]">
            {t("office.limits.title")}
          </h2>
          <p className="mt-4 max-w-[40rem] text-[15.5px] leading-[1.6] text-fg-muted">{t("office.limits.lead")}</p>
          <ul className="mt-8">
            {(Array.isArray(items) ? items : []).map((line) => (
              <li key={line} className="flex gap-3 border-t border-white/[0.07] py-4 text-[15px] leading-[1.55] text-fg/90">
                <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-fg-dim" />
                {line}
              </li>
            ))}
          </ul>
          <Link to="/faq" className="mt-7 inline-flex min-h-[44px] items-center gap-1.5 text-[15.5px] text-fg transition-colors hover:text-white">
            {t("office.limits.link")}
            <span aria-hidden>&rsaquo;</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}

const OfficePage = React.memo(function OfficePage() {
  usePageMeta("/office");
  const { t } = useTranslation();
  const { open: openDemoRequest } = useDemoRequest();
  const hire = React.useCallback((ids) => openDemoRequest(ids), [openDemoRequest]);
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  return (
    <div id="office">
      <StaffHero onHire={() => scrollTo("team")} onSee={() => scrollTo("staff-dali")} onPick={(id) => scrollTo(`staff-${id}`)} />
      {STAFF_ORDER.map((id, i) => (
        <StaffChapter key={id} id={id} index={i} onHire={hire} />
      ))}
      {/* the fifth is not a fifth chapter of the same room: she works for the
          owner, in her own interface, and is shown in it */}
      <OraIntro />
      <OraChapter onHire={hire} />
      <StaffTeam onHire={hire} />
      <StaffLimits />
      <StaffSteps />
      {/* the Modern Interiors licence requires this credit; it belongs beside the art */}
      <Container>
        <p className="border-t border-white/[0.06] py-8 text-[11.5px] leading-[1.6] text-fg-dim">
          {t("office.artCredit")}{" "}
          <a href="https://limezu.itch.io/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-fg-muted">LimeZu</a>
          {" — Modern Interiors · Modern Office"}
        </p>
      </Container>
    </div>
  );
});

function PageShell({ children }) {
  return <div className="pt-24 md:pt-28">{children}</div>;
}

// On route change: scroll to top (or to a hash target if state.scrollTo set).
function RouteScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  React.useEffect(() => {
    // Back and Forward restore their own scroll position. Scrolling to the
    // top on a POP threw the visitor to the top of the page every time the
    // request dialog closed, because closing it pops the history entry it
    // pushed to catch the Back gesture.
    if (navType === "POP") return undefined;
    const target = location.state && location.state.scrollTo;
    if (target) {
      // Pages with canvases and reveals settle their layout over the first
      // frames, so the target moves after the first scroll: scroll again
      // twice while that happens instead of landing short of it.
      const go = (behavior) => {
        const el = document.getElementById(target);
        if (!el) return false;
        const headerH = 56;
        const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
        if (Math.abs(y - window.scrollY) > 2) window.scrollTo({ top: y, behavior });
        return true;
      };
      const raf = requestAnimationFrame(() => {
        if (!go("smooth")) window.scrollTo({ top: 0, behavior: "auto" });
      });
      const timers = [400, 1000].map((ms) => setTimeout(() => go("auto"), ms));
      return () => {
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
      };
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return undefined;
  }, [location.pathname, location.state, navType]);
  return null;
}

function Shell() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-ink-950 text-fg">
      <ErrorBoundary>
      </ErrorBoundary>
      <ErrorBoundary>
        <Navbar />
      </ErrorBoundary>
      <RouteScrollManager />
      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <ErrorBoundary>
              <Routes location={location}>
                <Route path="/" element={<LandingPage />} />
                {/* the products page became the office page; old links and bookmarks still land */}
                <Route path="/products" element={<Navigate to="/office" replace />} />
                <Route path="/technology" element={<Navigate to="/" replace />} />
                <Route path="/office" element={<OfficePage />} />
                <Route path="/process" element={<ProcessPage />} />
                <Route path="/location" element={<LocationPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route
                  path="/setup"
                  element={
                    <React.Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
                      <Setup />
                    </React.Suspense>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
      <ErrorBoundary>
      </ErrorBoundary>
      <ErrorBoundary>
        <Chatbot />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Inside the router: the dialog records which page the request came from. */}
      <DemoRequestProvider>
        <Shell />
      </DemoRequestProvider>
    </BrowserRouter>
  );
}
