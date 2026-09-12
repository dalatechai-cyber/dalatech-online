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
  Navigate,
} from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";

import { AGENTS as OFFICE_AGENTS, BUNDLES as OFFICE_BUNDLES, formatTugrik } from "./office/agents";
import { loadAtlas as loadStaffAtlas, createStage as createPixelStage, ATLAS as STAFF_ATLAS, CHARS as STAFF_CHARS } from "./office/pixel";
import { drawHero as drawStaffHero, drawChapter as drawStaffChapter, drawWorkingDay, dayHour, DAY_MOMENTS, STAFF as STAFF_ORDER, HERO_MIN_W as STAFF_HERO_MIN_W } from "./office/scenes";

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

// Buying decisions only. Process, technology and location are trust pages
// and live in the footer, which keeps the bar narrow enough for a laptop.
// The website entry points into the pricing page's website block, so it
// never shows as the active page; the pricing entry does.
const NAV_ITEMS = [
  { to: "/office", labelKey: "staff" },
  { to: "/pricing", labelKey: "website", state: { scrollTo: "website" } },
  { to: "/pricing", labelKey: "pricing" },
  { to: "/portfolio", labelKey: "portfolio" },
  { to: "/faq", labelKey: "faq" },
];

let bodyScrollLockCount = 0;
let bodyScrollPrevOverflow = "";
function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyScrollPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;
}
function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = bodyScrollPrevOverflow;
  }
}

function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { open: openDemoRequest } = useDemoRequest();
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

  const openDemo = () => {
    setMobileOpen(false);
    openDemoRequest();
  };

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
          <Link to="/" className="flex shrink-0 items-center" data-cursor="hover" aria-label="DalaTech home">
            <BrandLockup size={40} />
          </Link>

          {/* in flow, not centred by absolute position: with eight items the
              links would sit under the logo and the CTA on anything narrower
              than a wide desktop, so below xl the menu button takes over */}
          <nav className="mx-6 hidden min-w-0 flex-1 items-center justify-center gap-6 lg:flex xl:gap-7">
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
              className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-fg lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
              </svg>
            </button>

            <div className="hidden md:block">
              <MagneticButton onClick={openDemo} variant="primary">
                {t("nav.getDemo")}
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
                const isActive = location.pathname === to;
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
              <MagneticButton onClick={openDemo} variant="primary">
                {t("nav.getDemo")}
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

function HeroWords({ text, delay = 0, stagger = 0.06 }) {
  const reduced = useReducedMotion();
  const words = text.split(/(\s+)/);
  let wIndex = 0;
  return (
    <span aria-label={text}>
      {words.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
        const idx = wIndex++;
        return (
          <span key={i} className="word-mask">
            <motion.span
              initial={reduced ? false : { y: "110%" }}
              animate={{ y: 0 }}
              transition={{ ...SPRING_HEADLINE, delay: delay + idx * stagger }}
              className="inline-block"
            >
              {tok}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function BrowserMockup({ url = "matrixecosalon.org", children, className = "" }) {
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

function MatrixSalonPreview() {
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
          <span className="font-display text-[11.5px] font-semibold tracking-tight text-white sm:text-[13px]">Matrix Eco Salon</span>
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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink-950/45 to-transparent" />
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const heroRef = React.useRef(null);
  // The text leaves as you scroll; the canvas does not move and does not fade,
  // because the pinned scene below is the same room at the same art scale and
  // the cut between them should be invisible.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0.35, 1], [0, -56]);
  const textOpacity = useTransform(scrollYProgress, [0.35, 1], [1, 0]);

  return (
    <section id="top" ref={heroRef} className="relative pb-16 pt-24 md:pb-24 md:pt-36">
      <Container>
        <motion.div
          style={reduced ? undefined : { y: textY, opacity: textOpacity }}
          className="mx-auto max-w-[640px] text-center lg:max-w-[760px]"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
            className="text-[11.5px] font-medium leading-[1.5] tracking-[0.14em] text-fg-dim"
          >
            {t("hero.badge")}
          </motion.p>

          <h1 className="mt-4 font-display text-[36px] font-semibold leading-[1.06] tracking-tightest text-fg sm:text-[48px] lg:text-[64px]">
            <HeroWords text={t("hero.title")} delay={0.15} stagger={0.045} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_REVEAL, delay: 0.5 }}
            className="mx-auto mt-6 max-w-[34rem] text-[16px] leading-[1.6] text-fg-muted sm:text-[17px] lg:text-[18px]"
          >
            {t("hero.description")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_REVEAL, delay: 0.65 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6"
          >
            <MagneticButton href="#demo" variant="primary" className="w-full sm:w-auto">
              {t("hero.buttons.getDemo")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </MagneticButton>
            {/* a link, not a second button box: the hero gets one accent */}
            <Link
              to="/office"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[17px] text-sky-400 transition-colors hover:text-sky-300"
            >
              {t("hero.buttons.seeWork")}
              <span aria-hidden>&rsaquo;</span>
            </Link>
          </motion.div>
        </motion.div>
      </Container>

      {/* full-bleed: the room runs edge to edge at every width */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_REVEAL, delay: 0.3 }}
        className="mt-12 md:mt-16"
      >
        <PixelStage
          draw={drawStaffHero}
          logicalH={128}
          scale={HERO_SCALE}
          minW={STAFF_HERO_MIN_W}
          label={t("office.hero.sceneAlt")}
        />
      </motion.div>
    </section>
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
              <MagneticButton href="https://matrixecosalon.org" variant="ghost">{t("portfolio.visitWebsite")}</MagneticButton>
              <MagneticButton href="#demo" variant="primary" demoServices={WEBSITE_ARA_DEMO_SERVICES}>{t("portfolio.getDemo")}</MagneticButton>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <a
              href="https://matrixecosalon.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              data-cursor="hover"
            >
              <div className="relative">
                <BrowserMockup url="matrixecosalon.org">
                  <MatrixSalonPreview />
                </BrowserMockup>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Pill>{t("portfolio.japantok.pills.website")}</Pill>
                <Pill>{t("portfolio.japantok.pills.chatbot")}</Pill>
                <Pill>{t("portfolio.japantok.pills.productQA")}</Pill>
                <Pill>{t("portfolio.japantok.pills.availability")}</Pill>
                <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-400">
                  matrixecosalon.org
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <path d="M7 17 17 7" /><path d="M7 7h10v10" />
                  </svg>
                </span>
              </div>
            </a>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card-glow flex h-full flex-col rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card">
              <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("portfolio.japantok.title")}</h3>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-fg-muted">{t("portfolio.japantok.description")}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("portfolio.japantok.whatWeBuilt")}</p>
                  <ul className="mt-3 space-y-2 text-[13.5px] text-fg/85">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2.5">
                        <CheckIcon />
                        <span>{t(`portfolio.japantok.features.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("portfolio.japantok.idealOutcomes")}</p>
                  <ul className="mt-3 space-y-2 text-[13.5px] text-fg/85">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2.5">
                        <CheckIcon />
                        <span>{t(`portfolio.japantok.outcomes.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton href="#demo" variant="primary" demoServices={WEBSITE_ARA_DEMO_SERVICES}>{t("portfolio.japantok.buttons.requestDemo")}</MagneticButton>
                <MagneticButton href="https://matrixecosalon.org" variant="ghost">{t("portfolio.japantok.buttons.viewLive")}</MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function LiveDemo() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scrollRef = React.useRef(null);
  const [step, setStep] = React.useState(0);
  const [typing, setTyping] = React.useState(false);

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

    runOnce();
    const loop = setInterval(runOnce, 13500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [reduced]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [step, typing, reduced]);

  const messages = [
    { from: "user", key: "user1", at: 1 },
    { from: "ai",   key: "ai1",   at: 2 },
    { from: "user", key: "user2", at: 3 },
    { from: "ai",   key: "ai2",   at: 4 },
    { from: "ai",   key: "ai3",   at: 5 },
  ];

  return (
    <section id="live-demo" className="relative py-28">
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
              <MagneticButton variant="ghost" href="#demo">
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
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px]"
                style={{
                  background:
                    "radial-gradient(60% 60% at 50% 25%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 70%)",
                }}
              />
              <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-ink-900/85 shadow-[0_40px_90px_-30px_rgba(8,12,28,0.9)] backdrop-blur">
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
                        <span className="inline-flex items-center gap-1.5">
                          <span className="relative inline-flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          </span>
                          {t("liveDemo.widget.statusOnline")}
                        </span>
                        <span className="text-fg-muted/40">·</span>
                        <span className="truncate">{t("liveDemo.widget.statusReply")}</span>
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
                  className="relative h-[380px] overflow-y-auto px-4 py-5"
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
                    </AnimatePresence>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] bg-white/[0.015] px-3 py-3">
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-ink-950/45 px-3.5 py-2.5 text-[13px] text-fg-muted/80">
                    <span className="flex-1 truncate">{t("liveDemo.widget.inputPlaceholder")}</span>
                    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/30">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 14-7-7 14-2-5z" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted/55">
                    {t("liveDemo.widget.footnote")}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function TestimonialCard({ quote, name, business, featured = false, offsetClass = "" }) {
  return (
    <StaggerItem className={offsetClass}>
      <figure
        className={[
          "group relative flex h-full flex-col rounded-2xl border bg-ink-800/45 p-7 sm:p-8",
          "transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]",
          featured
            ? "border-sky-400/35 bg-gradient-to-b from-sky-400/[0.05] to-transparent shadow-[0_0_0_1px_rgba(56,189,248,0.10),0_24px_60px_-30px_rgba(56,189,248,0.35)] hover:border-sky-400/60"
            : "border-white/[0.08]",
        ].join(" ")}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="currentColor"
          className={[
            "h-7 w-7 shrink-0 transition-colors duration-300",
            featured ? "text-sky-300/70" : "text-sky-400/40 group-hover:text-sky-300/55",
          ].join(" ")}
        >
          <path d="M9 7H5.5A3.5 3.5 0 0 0 2 10.5v2A3.5 3.5 0 0 0 5.5 16H7v.6A4.4 4.4 0 0 1 2.6 21H2v2h.6A6.4 6.4 0 0 0 9 16.6V8a1 1 0 0 0-1-1Zm12 0h-3.5A3.5 3.5 0 0 0 14 10.5v2A3.5 3.5 0 0 0 17.5 16H19v.6A4.4 4.4 0 0 1 14.6 21H14v2h.6A6.4 6.4 0 0 0 21 16.6V8a1 1 0 0 0-1-1Z" />
        </svg>
        <blockquote className="mt-5 flex-1 text-[15.5px] leading-[1.7] text-fg/95 sm:text-[16px]">
          {quote}
        </blockquote>
        <figcaption className="mt-7 flex flex-col gap-0.5 border-t border-white/[0.06] pt-5">
          <span className="font-display text-[14.5px] font-semibold tracking-tight text-fg">{name}</span>
          <span className="text-[12.5px] text-fg-muted">{business}</span>
        </figcaption>
      </figure>
    </StaggerItem>
  );
}

function Testimonials() {
  const { t } = useTranslation();
  const items = [
    { key: "0", offsetClass: "" },
    { key: "1", offsetClass: "lg:mt-10", featured: true },
    { key: "2", offsetClass: "" },
  ];
  return (
    <section id="testimonials" className="relative py-28">
      <Container>
        <SectionHeader
          eyebrow={t("testimonials.section")}
          title={t("testimonials.title")}
          description={t("testimonials.description")}
        />
        <StaggerGroup className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-start lg:gap-6">
          {items.map((item) => (
            <TestimonialCard
              key={item.key}
              offsetClass={item.offsetClass}
              featured={item.featured}
              quote={t(`testimonials.items.${item.key}.quote`)}
              name={t(`testimonials.items.${item.key}.name`)}
              business={t(`testimonials.items.${item.key}.business`)}
            />
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}

function PriceCard({ title, badge, priceLine, subLine, desc, bullets, cta, primary, footnote, demoServices }) {
  return (
    <StaggerItem>
      <div className="relative h-full pt-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5">
        {primary && (
          <span className="absolute left-6 top-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-sky-400/55 bg-sky-400/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 shadow-[0_8px_22px_-6px_rgba(56,189,248,0.7)] backdrop-blur">
            <span className="h-1 w-1 rounded-full bg-sky-300" />
            Featured
          </span>
        )}
        <div
          className={[
            "relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            primary
              ? "border border-sky-400/55 bg-gradient-to-b from-sky-400/[0.06] to-ink-800/65 shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_30px_70px_-30px_rgba(56,189,248,0.55)]"
              : "border border-white/[0.08] bg-ink-800/45 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]",
          ].join(" ")}
        >
          {primary && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.85) 50%, transparent 100%)" }}
            />
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{title}</p>
              {desc && <p className="mt-1.5 text-[13.5px] text-fg-muted">{desc}</p>}
            </div>
            {badge && (
              <span
                className={[
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  primary
                    ? "bg-sky-400/15 text-sky-200 ring-1 ring-inset ring-sky-400/40"
                    : "bg-white/[0.03] text-fg-muted ring-1 ring-inset ring-white/10",
                ].join(" ")}
              >
                {badge}
              </span>
            )}
          </div>
          <div className="mt-7">
            <p className="font-display text-[36px] font-semibold leading-none tracking-tightest text-fg sm:text-[40px]">{priceLine}</p>
            {subLine && <p className="mt-3 text-[13px] leading-[1.55] text-fg-muted">{subLine}</p>}
          </div>
          <ul className="mt-6 space-y-2.5 text-[13.5px] leading-[1.55] text-fg/90">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckIcon />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            <MagneticButton href="#demo" variant={primary ? "primary" : "ghost"} className="w-full" demoServices={demoServices}>{cta}</MagneticButton>
          </div>
          {footnote && <p className="mt-4 text-[11px] leading-[1.55] text-fg-muted/80">{footnote}</p>}
        </div>
      </div>
    </StaggerItem>
  );
}

// One card per AI staff member on the pricing page: the same facts as the
// office page, in the pricing page's own frame.
function StaffPriceCard({ id }) {
  const { t } = useTranslation();
  const a = OFFICE_AGENTS[id];
  const live = STAFF_LIVE[id];
  return (
    <StaggerItem className="h-full">
      <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[border-color,box-shadow] duration-300 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]">
        <div className="flex items-center gap-3">
          <span className="flex h-[66px] w-[60px] shrink-0 items-start justify-center overflow-hidden rounded-[12px] bg-white/[0.06]">
            <StaffAvatar id={id} size={3} className="-mt-[90px]" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[18px] font-semibold tracking-tight text-fg">{t(`office.agents.${id}.name`)}</p>
            <p className="text-[12.5px] text-fg-muted">{t(`office.agents.${id}.role`)}</p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-[1.5] text-fg-muted">{t(`office.agents.${id}.job`)}</p>
        <div className="mt-6">
          <StaffPrice id={id} />
        </div>
        <div className="mt-4">
          <StaffStatus live={live} />
        </div>
        <div className="mt-auto pt-6">
          <MagneticButton href="#demo" variant={live ? "primary" : "ghost"} className="w-full" demoServices={[id]}>
            {live ? t("pricing.staff.hire") : t("pricing.staff.preorder")}
          </MagneticButton>
        </div>
      </div>
    </StaggerItem>
  );
}

function Pricing() {
  const { t } = useTranslation();
  const terms = t("pricing.paymentTerms.terms", { returnObjects: true });
  return (
    <section id="pricing" className="relative py-16 md:py-28">
      <Container>
        <SectionHeader eyebrow={t("pricing.section")} title={t("pricing.title")} description={t("pricing.description")} />

        <Reveal className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("pricing.staff.title")}</h3>
              <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-[1.55] text-fg-muted">{t("pricing.staff.description")}</p>
            </div>
            <Link to="/office" state={{ scrollTo: "team" }} data-cursor="hover" className="pressable inline-flex min-h-[44px] items-center gap-1 text-[15px] text-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-md">
              {t("pricing.staff.teamLink")} <span aria-hidden>›</span>
            </Link>
          </div>
        </Reveal>
        <StaggerGroup className="mt-7 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAFF_ORDER.map((id) => <StaffPriceCard key={id} id={id} />)}
        </StaggerGroup>

        <div id="website" className="scroll-mt-24" />
        <Reveal className="mt-16">
          <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("pricing.website.title")}</h3>
          <p className="mt-1.5 text-[14.5px] text-fg-muted">{t("pricing.website.description")}</p>
        </Reveal>
        <StaggerGroup className="mt-7 grid gap-5 lg:grid-cols-2">
          <PriceCard
            title={t("pricing.cards.website.title")}
            badge={t("pricing.cards.website.badge")}
            priceLine={t("pricing.cards.website.price")}
            subLine={t("pricing.cards.website.subLine")}
            desc={t("pricing.cards.website.description")}
            bullets={t("pricing.cards.website.bullets", { returnObjects: true })}
            cta={t("pricing.cards.website.cta")}
            demoServices={WEBSITE_DEMO_SERVICES}
          />
          <PriceCard
            title={t("pricing.cards.bundle.title")}
            badge={t("pricing.cards.bundle.badge")}
            priceLine={
              <span>
                <span className="text-fg-muted/70 line-through">{t("pricing.cards.bundle.was")}</span>{" "}
                <span className="text-fg">{t("pricing.cards.bundle.price")}</span>
              </span>
            }
            subLine={t("pricing.cards.bundle.subLine")}
            desc={t("pricing.cards.bundle.description")}
            bullets={t("pricing.cards.bundle.bullets", { returnObjects: true })}
            cta={t("pricing.cards.bundle.cta")}
            demoServices={WEBSITE_ARA_DEMO_SERVICES}
            primary
          />
        </StaggerGroup>

        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-800/45 p-7 transition-[border-color,box-shadow] duration-300 hover:border-sky-400/25 hover:shadow-[0_24px_60px_-24px_rgba(56,189,248,0.25)]">
            <div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">{t("pricing.paymentTerms.title")}</p>
                <ul className="mt-5 grid gap-2.5 text-[14px] leading-[1.55] text-fg/90 sm:grid-cols-3 sm:gap-x-6">
                  {terms.map((term, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <MagneticButton href="#demo" variant="primary">{t("contact.title")}</MagneticButton>
            </div>
            <p className="mt-6 border-t border-white/[0.06] pt-5 text-[12.5px] leading-[1.55] text-fg-muted">{t("pricing.paymentTerms.note")}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <StaggerItem>
      <div
        className={[
          "rounded-2xl border bg-ink-800/45 transition-[border-color,box-shadow,background] duration-200",
          open
            ? "border-sky-400/35 bg-sky-400/[0.025] shadow-[0_18px_44px_-24px_rgba(56,189,248,0.32)]"
            : "border-white/[0.08] hover:border-white/20",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="pressable flex w-full items-start justify-between gap-5 px-5 py-4 text-left sm:px-6 sm:py-5"
          data-cursor="hover"
        >
          <p className="font-display text-[15.5px] font-semibold leading-[1.4] tracking-tight text-fg">{question}</p>
          <span
            className={[
              "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-fg transition-[transform,border-color,background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              open ? "rotate-45 border-sky-400/50 bg-sky-400/10 text-sky-300" : "border-white/10 bg-white/[0.03]",
            ].join(" ")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
              }}
              className="overflow-hidden"
            >
              <p className="px-5 pb-5 text-[14px] leading-[1.65] text-fg-muted sm:px-6 sm:pb-6">{answer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StaggerItem>
  );
}

function FAQ() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="relative py-20 md:py-24">
      <Container>
        <SectionHeader eyebrow={t("faq.section")} title={t("faq.title")} description={t("faq.description")} />

        <StaggerGroup className="mt-12 grid gap-3.5 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <FAQItem key={n} question={t(`faq.q${n}.question`)} answer={t(`faq.q${n}.answer`)} />
          ))}
        </StaggerGroup>

        <Reveal className="mt-10">
          <div
            className="relative overflow-hidden rounded-2xl p-7 transition-[border-color,box-shadow] duration-300"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(13,20,48,0.55) 0%, rgba(13,20,48,0.55) 100%), linear-gradient(135deg, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0) 40%, rgba(37,99,235,0.5) 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              border: "1px solid transparent",
              boxShadow: "0 30px 70px -32px rgba(56,189,248,0.4)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0) 65%)" }}
            />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <p className="font-display text-[18px] font-semibold tracking-tight text-fg sm:text-[19px]">{t("faq.stillHaveQuestions")}</p>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-fg-muted">{t("faq.contactPrompt")}</p>
              </div>
              <MagneticButton href="#demo" variant="primary">{t("faq.talkToUs")}</MagneticButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ----------------------------------------------------------- demo request */

/** Options offered as chips, in display order. Keys are shared with the API. */
// The four AI staff from /office come first so a visitor arriving from a desk
// sees their choice at the top of the chips.
const DEMO_SERVICES = ["ara", "nova", "veda", "eho", "website", "unsure"];

const DEMO_DRAFT_KEY = "dalatech:demo-draft";
/** Pre-selected chips for CTAs whose context already implies a product. */
const WEBSITE_ARA_DEMO_SERVICES = ["website", "ara"];
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
      .map((s) => t(`demoForm.services.${s}`))
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

  const panelRef = React.useRef(null);
  const firstFieldRef = React.useRef(null);
  const failureRef = React.useRef(null);
  const successRef = React.useRef(null);
  const requestIdRef = React.useRef(null);
  const abortRef = React.useRef(null);
  const restoreFocusRef = React.useRef(null);

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
  }, [isOpen, preset]);

  // Android's back gesture is the universal "dismiss" on a phone, and there is
  // no Escape key there. Without an entry of our own to pop, Back would take
  // the visitor off the site entirely and lose the request.
  React.useEffect(() => {
    if (!isOpen) return;

    let closedByBack = false;
    window.history.pushState({ ...window.history.state, dalatechDemoDialog: true }, "");

    const onPopState = () => {
      closedByBack = true;
      onClose();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      // Closed with the button or Escape instead: drop the entry we added so
      // the next Back press does what the visitor expects.
      if (!closedByBack && window.history.state && window.history.state.dalatechDemoDialog) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // Escape to close, focus trapped inside the panel, page behind frozen, and
  // the floating chat button hidden so it cannot overlap the sheet.
  React.useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement;
    lockBodyScroll();
    document.documentElement.classList.add("demo-dialog-open");

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
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
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [isOpen, onClose]);

  // On a phone, opening the keyboard immediately would hide the form, so only
  // desktop gets the cursor placed for it.
  React.useEffect(() => {
    if (!isOpen) return;
    const target = isMobile ? panelRef.current : firstFieldRef.current;
    const id = window.setTimeout(() => target && target.focus(), 60);
    return () => window.clearTimeout(id);
  }, [isOpen, isMobile]);

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

  // Mirror every keystroke into sessionStorage: a backgrounded tab, a reload or
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

  const onSubmit = async (event) => {
    event.preventDefault();
    if (status === "sending") return;

    const found = validateDemoForm(values, t);
    if (Object.keys(found).length) {
      setErrors(found);
      const firstInvalid = panelRef.current?.querySelector("[aria-invalid='true']");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (!requestIdRef.current) requestIdRef.current = newRequestId();

    const payload = {
      requestId: requestIdRef.current,
      name: values.name.trim(),
      phone: values.phone.trim(),
      business: values.business.trim(),
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
  };

  const sending = status === "sending";
  const phoneLabel = values.phone.trim();

  return (
    <AnimatePresence>
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
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: isMobile ? 40 : 16, scale: isMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: isMobile ? 40 : 8, scale: isMobile ? 1 : 0.98 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className="demo-sheet relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl outline-none sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                  {t("demoForm.eyebrow")}
                </p>
                <h2
                  id="demo-request-title"
                  className="mt-1.5 font-display text-[21px] font-semibold tracking-tight text-fg sm:text-[23px]"
                >
                  {t("demoForm.title")}
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
                <div className="mt-7">
                  <MagneticButton onClick={onClose} variant="primary">
                    {t("demoForm.success.close")}
                  </MagneticButton>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="demo-sheet-body space-y-5 px-5 py-5 sm:px-7">
                  <p className="text-[14px] leading-[1.6] text-fg-muted">{t("demoForm.subtitle")}</p>

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
                    id="demo-business"
                    label={t("demoForm.fields.business.label")}
                    error={errors.business}
                  >
                    <input
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
                      maxLength={120}
                      disabled={sending}
                      aria-invalid={errors.business ? "true" : undefined}
                      aria-describedby={errors.business ? "demo-business-error" : undefined}
                    />
                  </DemoField>

                  <fieldset disabled={sending} className="border-0 p-0">
                    <legend className="text-[13px] font-medium text-fg">
                      {t("demoForm.fields.services.label")}
                    </legend>
                    <p className="mt-1 text-[12px] text-fg-dim">{t("demoForm.fields.services.hint")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DEMO_SERVICES.map((service) => {
                        const active = values.services.includes(service);
                        return (
                          <button
                            key={service}
                            type="button"
                            onClick={() => toggleService(service)}
                            aria-pressed={active}
                            className={[
                              "pressable min-h-[44px] rounded-full border px-4 py-2.5 text-[13.5px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
                              active
                                ? "border-sky-400/60 bg-sky-400/12 text-sky-100"
                                : "border-white/10 bg-white/[0.02] text-fg-muted hover:border-white/25 hover:text-fg",
                            ].join(" ")}
                          >
                            {t(`demoForm.services.${service}`)}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

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
                      enterKeyHint="done"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      maxLength={160}
                      disabled={sending}
                      aria-invalid={errors.email ? "true" : undefined}
                      aria-describedby={errors.email ? "demo-email-error" : undefined}
                    />
                  </DemoField>

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

                <div
                  className="border-t border-white/[0.07] bg-ink-900/80 px-5 py-4 sm:px-7"
                  style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="submit"
                    disabled={sending}
                    className="pressable flex w-full items-center justify-center gap-2.5 rounded-xl bg-fg px-5 py-3.5 text-[15px] font-semibold tracking-tight text-ink-950 transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {sending && (
                      <span
                        aria-hidden
                        className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/25 border-t-ink-950"
                      />
                    )}
                    {sending
                      ? t("demoForm.submitting")
                      : status === "failed"
                        ? t("demoForm.retry")
                        : t("demoForm.submit")}
                  </button>
                  <p className="mt-3 text-center text-[11.5px] leading-[1.5] text-fg-dim">
                    {t("demoForm.privacy")}
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

  const value = React.useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

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

function Contact() {
  const { t } = useTranslation();
  const mailtoHref = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent("Демо хүсэлт / Demo Request")}`;

  return (
    <section id="contact" className="relative overflow-hidden py-20 sm:py-40">

      <Container className="relative">
        <StaggerGroup className="text-center" stagger={0.08} amount={0.3}>
          <StaggerItem>
            <h2 className="font-display mx-auto max-w-[22ch] text-[clamp(40px,7vw,80px)] font-semibold leading-[1.02] tracking-[-0.035em] text-fg">
              {t("contact.title")}
            </h2>
          </StaggerItem>

          <StaggerItem>
            <p className="mx-auto mt-7 max-w-[54ch] text-[16px] leading-[1.55] text-fg-muted sm:text-[17px]">
              {t("contact.description")}
            </p>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <MagneticButton href="#demo" variant="primary">
                <span>{t("contact.requestCta")}</span>
                <span aria-hidden className="contact-arrow inline-block">→</span>
              </MagneticButton>
              <MagneticButton href="https://app.dalatech.online" variant="ghost">
                {t("contact.demoCta")}
              </MagneticButton>
              <MagneticButton href={mailtoHref} variant="ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {t("contact.emailCta")}
              </MagneticButton>
            </div>
          </StaggerItem>

        </StaggerGroup>
      </Container>
    </section>
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
    { label: t("nav.website"), to: "/pricing", state: { scrollTo: "website" } },
    { label: t("nav.pricing"), to: "/pricing" },
  ];
  const company = [
    { label: t("nav.portfolio"), to: "/portfolio" },
    { label: t("nav.process"), to: "/process" },
    { label: t("nav.stack"), to: "/technology" },
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
                  className="pressable flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-fg-muted transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3V22A10 10 0 0 0 22 12z" />
                  </svg>
                </a>
                <a
                  href="mailto:dalatech.ai@gmail.com"
                  aria-label="Email DalaTech"
                  data-cursor="hover"
                  className="pressable inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12.5px] font-medium text-fg/85 transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
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

function TechStack() {
  const { t } = useTranslation();
  return (
    <section id="tech-stack" className="relative py-16 md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="mesh-blob animate-meshShift2 opacity-40"
          style={{
            top: "20%",
            right: "-8%",
            width: "26rem",
            height: "26rem",
            background: "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.13), transparent 70%)",
          }}
        />
      </div>
      <Container className="relative">
        <SectionHeader
          eyebrow={t("techStack.section")}
          title={t("techStack.title")}
          description={t("techStack.description")}
        />
        <Reveal className="mt-16">
          <ul
            className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-8 lg:gap-x-4"
            role="list"
          >
            {TECH_STACK.map((tech, i) => (
              <li key={tech.name} className="flex flex-col items-center gap-3">
                <div
                  className="animate-floatY pressable group relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:scale-[1.06] hover:border-sky-400/45 hover:shadow-[0_0_38px_-10px_rgba(56,189,248,0.55)] sm:h-[72px] sm:w-[72px]"
                  style={{
                    animationDelay: `${i * 0.45}s`,
                    animationDuration: `${5.4 + (i % 4) * 0.6}s`,
                  }}
                  data-cursor="hover"
                >
                  {tech.icon}
                </div>
                <span className="text-[12.5px] font-medium tracking-[-0.005em] text-fg-muted transition-colors duration-300 group-hover:text-fg sm:text-[13px]">
                  {tech.name}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
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
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="mesh-blob animate-meshShift opacity-40"
          style={{
            top: "10%",
            left: "-6%",
            width: "30rem",
            height: "30rem",
            background:
              "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.16), transparent 70%)",
          }}
        />
      </div>
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
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.022] px-3.5 py-1.5 ring-1 ring-inset ring-white/[0.04]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-fg-muted">
                47.91°N · 106.88°E
              </span>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

// Page wrappers: each route renders only its own sections. The bento grid
// repeats on the landing page and /products by design — landing surfaces it
// as a teaser, /products treats it as part of a deeper product story.
// ------------------------------------------------------------ a working day
// ζ = 1.05: critically damped, so scroll never springs past itself. restDelta
// has to be this small because the steepest leg of the timeline covers ~94
// scene-hours per unit of progress — framer's default would quantise the
// clock to roughly an hour.
const DAY_SPRING = { stiffness: 260, damping: 34, mass: 1, restDelta: 0.0002 };
const DAY_SCALE = (w) => (w < 1024 ? 2 : w < 1280 ? 3 : 3.5);
const DAY_H = (w) => (w < 640 ? 150 : w < 1024 ? 168 : 128);

// Where each moment's text wipes in and lifts out, in progress units.
const MOMENT_TEXT = [
  { in: [0.07, 0.115], out: [0.245, 0.28] },
  { in: [0.45, 0.495], out: [0.565, 0.6] },
  { in: [0.765, 0.81], out: [0.865, 0.9] },
];

function dayLabel(t, id) {
  const eyebrow = t(`office.chapters.${id}.eyebrow`);
  // Эхо is not in service yet, and the scene depicts him working; the site's
  // own word for that state goes on the label rather than being implied.
  return id === "eho" ? `${eyebrow} · ${t("office.status.soon")}` : eyebrow;
}

// A per-frame ticking clock reads as a slot machine. This steps in five
// minutes and hard-snaps to the three real timestamps inside the holds.
function DayClock({ progress }) {
  const [label, setLabel] = React.useState(DAY_MOMENTS[0].time);
  const read = React.useCallback((p) => {
    const hold = DAY_MOMENTS.find((m) => p >= m.from && p <= m.to);
    if (hold) return hold.time;
    const h = dayHour(p);
    let hh = Math.floor(h);
    let mm = Math.round(((h - hh) * 60) / 5) * 5;
    if (mm === 60) { mm = 0; hh += 1; }
    return `${String(hh % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }, []);
  React.useEffect(() => setLabel(read(progress.get())), [progress, read]);
  useMotionValueEvent(progress, "change", (p) => setLabel(read(p)));
  return (
    <span className="block font-display text-[34px] font-medium leading-none tabular-nums text-fg/90 md:text-[40px] lg:text-[44px]">
      {label}
    </span>
  );
}

function MomentHeadline({ progress, range, className = "", children }) {
  const reduced = useReducedMotion();
  const stops = [range.in[0], range.in[1], range.out[0], range.out[1]];
  const clip = useTransform(progress, [range.in[0], range.in[1]], ["inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  const opacity = useTransform(progress, stops, [0, 1, 1, 0]);
  const y = useTransform(progress, [range.out[0], range.out[1]], [0, -14]);
  if (reduced) return <p className={className}>{children}</p>;
  return (
    <motion.p style={{ clipPath: clip, opacity, y }} className={className}>
      {children}
    </motion.p>
  );
}

// Reduced motion, or no atlas: three ordinary stacked blocks in document
// order, each a still of the same scene held at the middle of its own hold.
// Every word and every bar is in the DOM, so this renders correctly even if
// no canvas ever appears.
const DAY_STATIC_SCALE = () => 2;
const DAY_STILLS = [0.17, 0.51, 0.82];

function DayStatic() {
  const { t } = useTranslation();
  // One motion value per block, created once: a hook may not run inside a
  // loop, and a fresh `scale` identity each render would tear the stage down.
  const p0 = useMotionValue(DAY_STILLS[0]);
  const p1 = useMotionValue(DAY_STILLS[1]);
  const p2 = useMotionValue(DAY_STILLS[2]);
  const one = useMotionValue(1);
  const stills = [p0, p1, p2];
  return (
    <div className="mt-12 flex flex-col gap-16">
      {DAY_MOMENTS.map((m, i) => (
        <div key={m.id}>
          <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-fg-dim">{dayLabel(t, m.id)}</p>
          <p className="mt-2 font-display text-[26px] font-medium leading-none tabular-nums text-fg/90">{m.time}</p>
          <p className="mt-3 font-display text-[22px] font-semibold leading-[1.2] tracking-tight text-fg sm:text-[26px]">
            {t(`day.moments.${m.id}`)}
          </p>
          <div className="mt-5">
            <PixelStage draw={drawWorkingDay} logicalH={128} scale={DAY_STATIC_SCALE} minW={STAFF_HERO_MIN_W} progress={stills[i]} label={t("day.sceneAlt")} />
          </div>
          <div className="mx-auto mt-5 max-w-[440px]">
            <DayArtefact id={m.id} progress={one} at={-1} />
          </div>
        </div>
      ))}
    </div>
  );
}

// The artefact beside each moment: the real chat, the real report, the real
// call, reusing the components /office already ships.
function DayArtefact({ id, progress, at, until }) {
  const { t } = useTranslation();
  const base = `office.chapters.${id}`;
  if (id === "veda") return <StaffReport report={t(`${base}.report`, { returnObjects: true })} progress={progress} at={at} span={0.12} until={until} />;
  if (id === "eho") return <StaffCall call={t(`${base}.call`, { returnObjects: true })} progress={progress} at={at} step={0.025} until={until} />;
  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-ink-950/70 p-3 backdrop-blur-[2px]">
      <StaffChat lines={t(`${base}.chat`, { returnObjects: true })} progress={progress} at={at} step={0.035} until={until} />
    </div>
  );
}

const DAY_ARTEFACT_AT = { ara: 0.09, veda: 0.44, eho: 0.76 };

function DayArtefactHolder({ moment, progress, stacked, hidden }) {
  const opacity = useTransform(progress, [moment.from, moment.from + 0.03, moment.to - 0.03, moment.to], [0, 1, 1, 0]);
  return (
    <motion.div
      style={{ opacity, pointerEvents: "none" }}
      className={stacked ? "absolute inset-x-0 top-0" : ""}
      aria-hidden={hidden}
    >
      <DayArtefact id={moment.id} progress={progress} at={DAY_ARTEFACT_AT[moment.id]} until={moment.to} />
    </motion.div>
  );
}

function WorkingDay() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { error } = useStaffAtlas();
  const dayRef = React.useRef(null);
  const progress = useDampedProgress(dayRef, ["start start", "end end"], DAY_SPRING);

  const settleScale = useTransform(progress, [0, 0.06], [1.03, 1]);
  const settleOpacity = useTransform(progress, [0, 0.06], [0.35, 1]);
  const chromeOpacity = useTransform(progress, [0, 0.05, 0.97, 1], [0, 1, 1, 0]);

  // The page itself lifts as the sun comes up and settles back by nightfall.
  // It returns home at p = 1, so there is nothing to reset on the way out.
  const pageBg = useTransform(
    progress,
    [0, 0.3, 0.48, 0.64, 0.86, 1],
    ["#050A18", "#050A18", "#0D1430", "#0D1430", "#080D1E", "#050A18"]
  );
  useMotionValueEvent(pageBg, "change", (v) => {
    document.documentElement.style.setProperty("--page-bg", v);
  });
  React.useEffect(() => () => document.documentElement.style.removeProperty("--page-bg"), []);

  const [active, setActive] = React.useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const i = DAY_MOMENTS.findIndex((m) => p >= m.from && p <= m.to);
    if (i !== -1 && i !== active) setActive(i);
  });

  const heading = (
    <Container>
      <h2 className="max-w-[18ch] font-display text-[30px] font-semibold leading-[1.1] tracking-tightest text-fg sm:text-[38px] lg:text-[44px]">
        {t("day.title")}
      </h2>
      <p className="mt-4 max-w-[34rem] text-[16px] leading-[1.6] text-fg-muted sm:text-[17px]">{t("day.lead")}</p>
    </Container>
  );

  if (reduced || error) {
    return (
      <section className="py-20 md:py-28">
        {heading}
        <Container>
          <DayStatic />
          <p className="mt-14 text-[15px] leading-[1.6] text-fg-muted">{t("day.closing")}</p>
        </Container>
      </section>
    );
  }

  return (
    <section data-pin className="relative py-20 md:py-28">
      {heading}

      <div ref={dayRef} className="relative mt-10 h-[260vh] md:h-[320vh]">
        <div className="day-pin flex flex-col justify-center">
          <Container>
            <motion.div style={{ opacity: chromeOpacity }}>
              <DayClock progress={progress} />
              <p className="mt-1.5 text-[11.5px] font-medium uppercase tracking-[0.16em] text-fg-dim">
                {dayLabel(t, DAY_MOMENTS[active].id)}
              </p>
            </motion.div>
          </Container>

          <div className="relative mt-4 lg:order-3 lg:mt-8">
            <motion.div style={{ scale: settleScale, opacity: settleOpacity }} className="day-band origin-bottom">
              <PixelStage
                draw={drawWorkingDay}
                logicalH={DAY_H}
                scale={DAY_SCALE}
                minW={STAFF_HERO_MIN_W}
                progress={progress}
                label={t("day.sceneAlt")}
              />
            </motion.div>
          </div>

          <Container className="mt-4 lg:order-2 lg:mt-0">
            <div className="relative z-10 min-h-[60px] lg:min-h-[96px]">
              {DAY_MOMENTS.map((m, i) => (
                <MomentHeadline
                  key={m.id}
                  progress={progress}
                  range={MOMENT_TEXT[i]}
                  className="absolute inset-x-0 top-0 max-w-[18ch] font-display text-[22px] font-semibold leading-[1.15] tracking-tight text-fg sm:text-[26px] lg:text-[40px]"
                >
                  {t(`day.moments.${m.id}`)}
                </MomentHeadline>
              ))}
            </div>
          </Container>

          {/* all three stay mounted; the inactive ones are inert and hidden */}
          <Container className="mt-4 lg:mt-0">
            <div className="relative z-10 mx-auto max-w-[440px] lg:absolute lg:right-[max(40px,calc(50vw-560px))] lg:top-1/2 lg:m-0 lg:max-w-[380px] lg:-translate-y-1/2">
              {DAY_MOMENTS.map((m, i) => (
                <DayArtefactHolder key={m.id} moment={m} progress={progress} stacked={i > 0} hidden={active !== i} />
              ))}
            </div>
          </Container>
        </div>
      </div>

      <Container>
        <p className="mt-14 text-[15px] leading-[1.6] text-fg-muted">{t("day.closing")}</p>
      </Container>
    </section>
  );
}

function LandingPage() {
  return (
    <>
      <Hero />
      {/* one day in one room: the page's argument, made once, in pictures */}
      <ErrorBoundary fallback={null}>
        <WorkingDay />
      </ErrorBoundary>
      <LiveDemo />
      <Portfolio />
      <Testimonials />
      <StaffSteps />
      <Contact />
    </>
  );
}

function ProcessPage() {
  return (
    <PageShell>
      <HowItWorks />
      <ProcessTimeline />
    </PageShell>
  );
}

function TechnologyPage() {
  return (
    <PageShell>
      <TechStack />
    </PageShell>
  );
}

function LocationPage() {
  return (
    <PageShell>
      <LocationBadge />
    </PageShell>
  );
}

function PortfolioPage() {
  return (
    <PageShell>
      <Portfolio />
    </PageShell>
  );
}

function PricingPage() {
  return (
    <PageShell>
      <Pricing />
    </PageShell>
  );
}

function FAQPage() {
  return (
    <PageShell>
      <FAQ />
      <Testimonials />
    </PageShell>
  );
}

// Pads non-landing pages so content sits below the fixed navbar.

// ---------------------------------------------------------------------------
// /office — four AI staff, drawn in pixel art. One pinned hero where the day
// runs with the scroll, a chapter per person with their real messages floating
// over the scene, a team builder on paper, three steps. The canvas engine
// lives in src/office/pixel.js, the scenes in src/office/scenes.js.

const STAFF_LIVE = { ara: true, veda: true, eho: false, nova: false };

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
    const dpr = Math.min(3, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
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

// One line that rises into place as the scroll passes `at`.
function Rise({ progress, at, span = 0.08, until, className = "", children }) {
  const reduced = useReducedMotion();
  // Without `until` a line rises once and stays, which is what the chapters
  // want. The pinned day scene needs the block to leave before the next
  // moment arrives, so the ramp runs back down to zero at the far end.
  //
  // The exit ramp is a short fixed fade, not another `span`: a late line in a
  // staggered group can start after `until - span`, and useTransform requires
  // strictly increasing inputs — a non-monotonic stop list silently produced a
  // broken transform and the card never appeared.
  const OUT = 0.04;
  const inEnd = at + span;
  const outStart = Math.max(inEnd + 1e-4, Math.min(until - OUT, until - 1e-4));
  const useUntil = until !== undefined && until > inEnd;
  const stops = useUntil ? [at, inEnd, outStart, until] : [at, inEnd];
  const opacity = useTransform(progress, stops, useUntil ? [0, 1, 1, 0] : [0, 1]);
  const y = useTransform(
    progress,
    stops,
    useUntil ? [reduced ? 0 : 14, 0, 0, reduced ? 0 : -10] : [reduced ? 0 : 14, 0]
  );
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

const HERO_SCALE = (w) => (w < 640 ? 1.5 : w < 900 ? 2 : 3);
const CHAPTER_SCALE = (w) => (w < 640 ? 2 : 3);
// phones get a taller room so the messages fit beside the person
const CHAPTER_HEIGHT = (w) => (w < 640 ? 176 : 128);

function StaffStatus({ live }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
      <span className={["h-1.5 w-1.5 rounded-full", live ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" : "bg-fg-dim/70"].join(" ")} aria-hidden />
      {live ? t("office.status.live") : t("office.status.soon")}
    </span>
  );
}

// The four, at a glance: name, role, job, monthly price and whether they are
// live. Each card jumps to that person's chapter on the office page.
function StaffCards({ onPick, className = "" }) {
  const { t } = useTranslation();
  return (
    <StaggerGroup className={["mx-auto grid max-w-[1040px] auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4", className].join(" ")}>
      {STAFF_ORDER.map((id) => (
        <StaggerItem key={id} className="h-full">
          <button
            type="button"
            onClick={() => onPick(id)}
            data-cursor="hover"
            className="pressable group flex h-full w-full flex-col rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3.5 text-left transition-colors hover:border-white/[0.2] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:p-4"
          >
            <span className="flex items-center gap-3">
              {/* the face, not the hair: the head sits on rows 20-53 of the frame; at 3x, 90px down puts the eyes in the box */}
              <span className="flex h-[66px] w-[60px] shrink-0 items-start justify-center overflow-hidden rounded-[12px] bg-white/[0.06]">
                <StaffAvatar id={id} size={3} className="-mt-[90px]" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[17px] font-semibold tracking-tight text-fg">{t(`office.agents.${id}.name`)}</span>
                <span className="block text-[12px] leading-[1.3] text-fg-muted">{t(`office.agents.${id}.role`)}</span>
              </span>
            </span>
            <span className="mt-3 block flex-1 text-[13px] leading-[1.45] text-fg-muted">{t(`office.agents.${id}.job`)}</span>
            <span className="mt-3 flex flex-col gap-1.5 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
              <span className="whitespace-nowrap font-display text-[15px] font-semibold tabular-nums tracking-tight text-fg">
                {formatTugrik(OFFICE_AGENTS[id].monthly)}<span className="text-[12px] font-normal text-fg-muted">{t("office.price.perMonth")}</span>
              </span>
              <StaffStatus live={STAFF_LIVE[id]} />
            </span>
          </button>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

function StaffHero({ onHire, onSee, onPick }) {
  const { t } = useTranslation();
  return (
    <section className="pb-6 pt-[96px] md:pb-10 md:pt-[128px]">
      <Container>
        <div className="mx-auto max-w-[760px] text-center">
          <SectionLabel>{t("office.section")}</SectionLabel>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_HEADLINE}
            className="mt-4 font-display text-[38px] font-semibold leading-[1.06] tracking-tightest text-fg sm:text-[50px] md:text-[60px]"
          >
            {t("office.hero.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_REVEAL, delay: 0.08 }}
            className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.5] text-fg-muted"
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
      </Container>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_REVEAL, delay: 0.22 }}
        className="mx-auto mt-10 w-full max-w-[1040px] px-0 sm:px-7 md:mt-12"
      >
        <PixelStage
          draw={drawStaffHero}
          logicalH={128}
          scale={HERO_SCALE}
          minW={STAFF_HERO_MIN_W}
          label={t("office.hero.sceneAlt")}
          className="sm:rounded-[24px] sm:border sm:border-white/[0.08]"
        />
      </motion.div>
      <Container>
        <StaffCards className="mt-6 md:mt-8" onPick={onPick} />
      </Container>
    </section>
  );
}

function StaffPrice({ id, align = "left" }) {
  const { t } = useTranslation();
  const a = OFFICE_AGENTS[id];
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="font-display text-[22px] font-semibold tracking-tight text-fg">
        {formatTugrik(a.monthly)}
        <span className="text-[14px] font-normal text-fg-muted">{t("office.price.perMonth")}</span>
        {a.perMinute && <span className="text-[13px] font-normal text-fg-muted"> {t("office.price.plusPerMinute")}</span>}
      </p>
      <p className="mt-1 text-[13px] text-fg-muted">
        {t("office.price.setup", { price: formatTugrik(a.setup) })}
        {a.addOnOnly && <> · {t("office.price.addOnOnly")}</>}
      </p>
    </div>
  );
}

// A chat as the customer sees it in Messenger. The time is shown once per
// exchange, beside the bubble that opens it, never as a log under each line.
function StaffChat({ lines, progress, at, step = 0.07, until }) {
  return (
    <ol className="flex flex-col gap-2" role="list">
      {lines.map((m, i) => {
        const mine = m.from === "staff";
        const stamp = i === 0 || m.time !== lines[i - 1].time ? m.time : null;
        return (
          <Rise key={i} progress={progress} at={at + i * step} until={until} className={["flex max-w-[94%] items-end gap-1.5", mine ? "flex-row-reverse self-end" : "self-start"].join(" ")}>
            <li
              className={[
                "rounded-[16px] px-3 py-2 text-[13px] leading-[1.42] shadow-[0_2px_10px_rgba(0,0,0,0.25)] sm:text-[14px]",
                mine ? "rounded-br-[5px] bg-brand-500 text-white" : "rounded-bl-[5px] bg-[#1C2547] text-fg",
              ].join(" ")}
            >
              {m.text}
            </li>
            {stamp && <span className="mb-1 shrink-0 text-[11px] tabular-nums text-fg-muted">{stamp}</span>}
          </Rise>
        );
      })}
    </ol>
  );
}

// Веда's report: the same four bars the scene draws on her screen.
function StaffReport({ report, progress, at, span = 0.22, until }) {
  const grow = useTransform(progress, [at, at + span], [0, 1]);
  return (
    <Rise progress={progress} at={at} until={until} className="rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 p-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-dim">{report.tag}</p>
      <p className="mt-1 text-[13px] font-semibold text-fg">{report.title}</p>
      <div className="mt-3 flex h-[72px] items-end gap-2" aria-hidden>
        {report.values.map((v, i) => (
          <ReportBar key={i} value={v} index={i} count={report.values.length} grow={grow} last={i === report.values.length - 1} />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-2 text-[10px] text-fg-dim">
        {report.weeks.map((w) => <span key={w} className="truncate text-center">{w}</span>)}
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.45] text-fg/85">{report.insight}</p>
    </Rise>
  );
}

function ReportBar({ value, index, count, grow, last }) {
  // each bar grows in turn, left to right, as the chapter scrolls in
  const scaleY = useTransform(grow, (g) => Math.min(1, Math.max(0, g * count - index)));
  return (
    <div className="flex flex-1 items-end" style={{ height: "100%" }}>
      <motion.div
        style={{ height: `${value * 100}%`, scaleY, transformOrigin: "bottom" }}
        className={["w-full rounded-t-[3px]", last ? "bg-sky-400" : "bg-brand-500/70"].join(" ")}
      />
    </div>
  );
}

// Эхо's call: incoming, answered, the first line.
function StaffCall({ call, progress, at, step = 0.09, until }) {
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-2">
      <Rise progress={progress} at={at} until={until} className="flex items-center gap-3 rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 px-3.5 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-400" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-fg">{call.incoming}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-fg-muted">18:05</span>
      </Rise>
      <Rise progress={progress} at={at + step} until={until} className="flex items-center gap-3 rounded-[16px] border border-white/[0.1] bg-[#0F1633]/95 px-3.5 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
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
      </Rise>
      <Rise progress={progress} at={at + 2 * step} until={until} className="self-end">
        <p className="max-w-[92%] rounded-[16px] rounded-br-[5px] bg-brand-500 px-3 py-2 text-[13px] leading-[1.42] text-white shadow-[0_2px_10px_rgba(0,0,0,0.25)] sm:text-[14px]">{call.line}</p>
      </Rise>
    </div>
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
  const AT = 0.3;

  let overlay = null;
  if (id === "veda") overlay = <StaffReport report={t(`${base}.report`, { returnObjects: true })} progress={progress} at={AT} />;
  else if (id === "eho") overlay = <StaffCall call={t(`${base}.call`, { returnObjects: true })} progress={progress} at={AT} />;
  else overlay = <StaffChat lines={t(`${base}.chat`, { returnObjects: true })} progress={progress} at={AT} />;

  return (
    <section ref={ref} id={`staff-${id}`} className="py-14 md:py-24">
      <Container>
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
  const [picked, setPicked] = React.useState(() => new Set(["ara"]));
  const ids = STAFF_ORDER;
  const toggle = (id) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const chosen = ids.filter((id) => picked.has(id));
  const bundle = OFFICE_BUNDLES.find((b) => b.agents === chosen.length);
  const discount = bundle ? bundle.discount : 0;
  const monthlyFull = chosen.reduce((s, id) => s + OFFICE_AGENTS[id].monthly, 0);
  const monthly = Math.round(monthlyFull * (1 - discount));
  const setup = chosen.reduce((s, id) => s + OFFICE_AGENTS[id].setup, 0);
  const vedaAlone = chosen.length === 1 && chosen[0] === "veda";
  const anyLive = chosen.some((id) => STAFF_LIVE[id]);
  const blocked = chosen.length === 0 || vedaAlone;

  return (
    <section id="team" className="py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-[980px]">
          <Reveal className="text-center">
            <SectionLabel>{t("office.team.eyebrow")}</SectionLabel>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.08] tracking-tightest text-fg sm:text-[42px] md:text-[48px]">{t("office.team.title")}</h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.47] text-fg-muted">{t("office.team.description")}</p>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-4" role="group" aria-label={t("office.team.pick")}>
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
                    <span className="mt-1 block text-[13px] font-medium tabular-nums text-fg">{formatTugrik(a.monthly)}<span className="font-normal text-fg-muted">{t("office.price.perMonth")}</span></span>
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
                  <span className="font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-fg">{formatTugrik(chosen.length ? monthly : 0)}</span>
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
              {vedaAlone && <p>{t("office.team.vedaAlone")}</p>}
              {!blocked && picked.has("eho") && <p>{t("office.team.perMinuteNote")}</p>}
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
                <p className="font-display text-[13px] font-semibold tabular-nums text-sky-400">0{i + 1}</p>
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

function OfficePage() {
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
      <StaffHero onHire={() => scrollTo("team")} onSee={() => scrollTo("staff-ara")} onPick={(id) => scrollTo(`staff-${id}`)} />
      {STAFF_ORDER.map((id, i) => (
        <StaffChapter key={id} id={id} index={i} onHire={hire} />
      ))}
      <StaffTeam onHire={hire} />
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
}

function PageShell({ children }) {
  return <div className="pt-24 md:pt-28">{children}</div>;
}

// On route change: scroll to top (or to a hash target if state.scrollTo set).
function RouteScrollManager() {
  const location = useLocation();
  React.useEffect(() => {
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
  }, [location.pathname, location.state]);
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
                <Route path="/office" element={<OfficePage />} />
                <Route path="/process" element={<ProcessPage />} />
                <Route path="/technology" element={<TechnologyPage />} />
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
                <Route path="*" element={<Navigate to="/" replace />} />
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
