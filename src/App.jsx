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
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

import { AGENTS as OFFICE_AGENTS, BUNDLES as OFFICE_BUNDLES, formatTugrik } from "./office/agents";
import { DESKS as OFFICE_DESKS, COLS as OFFICE_COLS, VIEW_ROWS as OFFICE_ROWS } from "./office/layout";

const Setup = React.lazy(() => import("./Setup"));
const Globe = React.lazy(() => import("./Globe"));
const OfficeScene = React.lazy(() => import("./OfficeScene"));

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

function CustomCursor() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 200, damping: 28, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 200, damping: 28, mass: 0.5 });
  const [hover, setHover] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const visibleRef = React.useRef(false);

  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  React.useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    document.documentElement.classList.add("has-custom-cursor");

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visibleRef.current) setVisible(true);
    };
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);
    const checkHover = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const interactive = t.closest('a,button,[role="button"],input,textarea,select,summary,label,[data-cursor="hover"]');
      setHover(Boolean(interactive));
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", checkHover, { passive: true });
    window.addEventListener("pointerleave", leave);
    window.addEventListener("pointerenter", enter);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", checkHover);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerenter", enter);
    };
  }, [reduced, x, y]);

  if (reduced) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100001] hidden md:block"
        style={{ x, y, opacity: visible ? 1 : 0 }}
      >
        <motion.div
          className="h-2 w-2 rounded-full bg-fg"
          style={{ x: "-50%", y: "-50%", scale: hover ? 0.5 : 1 }}
          transition={{ scale: { type: "spring", stiffness: 300, damping: 25 } }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100000] hidden md:block"
        style={{ x: sx, y: sy, opacity: visible ? 1 : 0 }}
      >
        <motion.div
          className="h-9 w-9 rounded-full border border-sky-400/60 mix-blend-difference"
          style={{ x: "-50%", y: "-50%", scale: hover ? 1.6 : 1 }}
          transition={{ scale: { type: "spring", stiffness: 220, damping: 20 } }}
        />
      </motion.div>
    </>
  );
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
    const r = ref.current.getBoundingClientRect();
    const relX = e.clientX - (r.left + r.width / 2);
    const relY = e.clientY - (r.top + r.height / 2);
    x.set(relX * 0.25);
    y.set(relY * 0.35);
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
      {variant === "primary" && !disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.45), 0 16px 40px -8px rgba(56,189,248,0.45)" }}
        />
      )}
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

function MeshBackground({ intensity = 1 }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div
          className="mesh-blob"
          style={{
            top: "-8%", left: "-10%",
            width: "26rem", height: "26rem",
            background: "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.45), rgba(37,99,235,0) 65%)",
            filter: "blur(48px)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />
      </div>
    );
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid animate-gridPulse" />
      <div
        className="mesh-blob animate-meshShift"
        style={{
          top: "-12%", left: "10%",
          width: `${44 * intensity}rem`, height: `${44 * intensity}rem`,
          background: "radial-gradient(circle at 30% 30%, rgba(37,99,235,0.65), rgba(37,99,235,0) 60%)",
        }}
      />
      <div
        className="mesh-blob animate-meshShift2"
        style={{
          bottom: "-18%", right: "-8%",
          width: `${52 * intensity}rem`, height: `${52 * intensity}rem`,
          background: "radial-gradient(circle at 60% 50%, rgba(56,189,248,0.45), rgba(56,189,248,0) 65%)",
        }}
      />
      <div
        className="mesh-blob animate-meshShift"
        style={{
          top: "20%", right: "20%",
          width: "28rem", height: "28rem",
          background: "radial-gradient(circle at 50% 50%, rgba(13,20,48,0.85), rgba(13,20,48,0) 70%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />
    </div>
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
      <span className="h-px w-6 bg-gradient-to-r from-transparent via-sky-400/60 to-sky-400/0" />
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
  { code: "en", label: "English" },
  { code: "mn", label: "Монгол" },
  { code: "zh-TW", label: "繁體中文" },
];

const NAV_ITEMS = [
  { to: "/products", labelKey: "capabilities" },
  { to: "/office", labelKey: "staff" },
  { to: "/process", labelKey: "process" },
  { to: "/technology", labelKey: "stack" },
  { to: "/location", labelKey: "location" },
  { to: "/portfolio", labelKey: "portfolio" },
  { to: "/pricing", labelKey: "pricing" },
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
              borderBottom: "1px solid rgba(56,189,248,0.20)",
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

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex lg:gap-7">
            {NAV_ITEMS.map(({ to, labelKey }) => (
              <RouterNavLink
                key={to}
                to={to}
                data-cursor="hover"
                className={({ isActive }) =>
                  [
                    "relative text-[13.5px] font-medium tracking-[-0.005em] transition-colors duration-200",
                    isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <span className="relative inline-block">
                    {navLabel(labelKey)}
                    {isActive && (
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
              className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-fg md:hidden"
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
            className="fixed inset-0 flex flex-col md:hidden"
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
              {NAV_ITEMS.map(({ to, labelKey }) => {
                const isActive = location.pathname === to;
                return (
                  <motion.div
                    key={to}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      show: { opacity: 1, y: 0, transition: SPRING_REVEAL },
                    }}
                  >
                    <Link
                      to={to}
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

function HeroWords({ text, delay = 0 }) {
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
              transition={{ ...SPRING_HEADLINE, delay: delay + idx * 0.06 }}
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

function HeroDemoCard() {
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const parallaxDistance = reduced || isMobile ? 0 : -36;
  const yT = useTransform(scrollY, [0, 600], [0, parallaxDistance]);
  const y = useSpring(yT, { stiffness: 80, damping: 22, mass: 0.4 });

  return (
    <motion.div style={isMobile ? undefined : { y }} className="relative">
      <BrowserMockup url="matrixecosalon.org">
        <MatrixSalonPreview />
      </BrowserMockup>
      <div
        aria-hidden
        className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-900/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted backdrop-blur md:left-0 md:top-auto md:bottom-full md:mb-3"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
        </span>
        Live client
      </div>
    </motion.div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-16 md:pt-40 md:pb-36">
      <MeshBackground />
      <Container className="relative">
        <div className="grid items-center gap-14 md:grid-cols-[1fr_1fr] md:gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium tracking-wide text-fg-muted backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
              </span>
              {t("hero.badge")}
            </motion.div>

            <h1 className="mt-7 font-display text-[44px] font-semibold leading-[1.05] tracking-tightest text-fg sm:text-[56px] md:text-[60px] lg:text-[68px]">
              <HeroWords text={t("hero.title")} delay={0.15} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_REVEAL, delay: 0.55 }}
              className="mt-6 max-w-[44ch] text-[17px] leading-[1.6] text-fg-muted"
            >
              {t("hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_REVEAL, delay: 0.7 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <MagneticButton href="#demo" variant="primary">
                {t("hero.buttons.getDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
              <MagneticButton href="/portfolio" variant="ghost">
                {t("hero.buttons.seeWork")}
              </MagneticButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_REVEAL, delay: 0.85 }}
              className="mt-12"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted/80">
                {t("hero.tech")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {["React", "Tailwind CSS", "OpenAI", "Vite"].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-[13px] font-medium text-fg/90 transition-colors hover:border-white/20"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <HeroDemoCard />
        </div>
      </Container>
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

function ServiceCard({ index, title, subtitle, bullets, badge, featured = false }) {
  return (
    <StaggerItem>
      <article
        className={[
          "relative flex h-full flex-col overflow-hidden rounded-2xl p-7 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          featured
            ? "border border-sky-400/40 bg-gradient-to-b from-sky-400/[0.07] to-ink-800/60 shadow-[0_30px_70px_-30px_rgba(56,189,248,0.45)] hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-[0_40px_90px_-30px_rgba(56,189,248,0.55)] md:-translate-y-2"
            : "border border-white/[0.08] bg-ink-800/45 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]",
        ].join(" ")}
      >
        {featured && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-px left-1/2 h-[2px] w-2/3 -translate-x-1/2 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.7) 50%, transparent 100%)" }}
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <span className={["text-[11px] font-semibold uppercase tracking-[0.16em]", featured ? "text-sky-300" : "text-fg-muted"].join(" ")}>
            {String(index).padStart(2, "0")}
          </span>
          {badge && (
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                featured
                  ? "bg-sky-400/15 text-sky-200 ring-1 ring-inset ring-sky-400/40"
                  : "bg-white/[0.03] text-fg-muted ring-1 ring-inset ring-white/10",
              ].join(" ")}
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="mt-5 font-display text-[22px] font-semibold leading-[1.15] tracking-tight text-fg sm:text-[24px]">
          {title}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.6] text-fg-muted">{subtitle}</p>
        <ul className="mt-6 space-y-3 text-[13.5px] leading-[1.55] text-fg/90">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckIcon />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </article>
    </StaggerItem>
  );
}

function Features() {
  const { t } = useTranslation();
  return (
    <section id="features" className="relative py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="mesh-blob animate-meshShift opacity-50" style={{ top: "20%", left: "-10%", width: "32rem", height: "32rem", background: "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.2), transparent 70%)" }} />
      </div>
      <Container className="relative">
        <SectionHeader eyebrow={t("features.section")} title={t("features.title")} description={t("features.description")} />

        <StaggerGroup className="mt-14 grid items-stretch gap-5 md:grid-cols-3 md:items-end">
          <ServiceCard
            index={1}
            title={t("features.voiceAgent.title")}
            badge={t("features.voiceAgent.badge")}
            subtitle={t("features.voiceAgent.subtitle")}
            bullets={[t("features.voiceAgent.bullets.0"), t("features.voiceAgent.bullets.1"), t("features.voiceAgent.bullets.2")]}
          />
          <ServiceCard
            index={2}
            title={t("features.chatbot.title")}
            badge={t("features.chatbot.badge")}
            subtitle={t("features.chatbot.subtitle")}
            bullets={[t("features.chatbot.bullets.0"), t("features.chatbot.bullets.1"), t("features.chatbot.bullets.2")]}
            featured
          />
          <ServiceCard
            index={3}
            title={t("features.fullIntegration.title")}
            badge={t("features.fullIntegration.badge")}
            subtitle={t("features.fullIntegration.subtitle")}
            bullets={[t("features.fullIntegration.bullets.0"), t("features.fullIntegration.bullets.1"), t("features.fullIntegration.bullets.2")]}
          />
        </StaggerGroup>
      </Container>
    </section>
  );
}

function BentoCardShell({ children, onPointerEnter, onPointerLeave, innerRef, className = "" }) {
  return (
    <div
      ref={innerRef}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={["card-glow group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-800/55 p-6 shadow-card sm:p-7", className].join(" ")}
    >
      {children}
    </div>
  );
}

// Touch devices don't get a sustained pointerenter, so the bento micro-animations
// would never play on mobile. Watch the card and flip an "in view" flag once per
// session so the animation runs automatically. Desktop hover paths are untouched.
function useTouchInViewOnce() {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: none)").matches;
    if (!isTouch) return;
    const el = ref.current;
    if (!el) return;
    // Only start the animation once the card's center has crossed roughly
    // 60% of the viewport from the top. Bottom rootMargin of -38% delays the
    // intersection until the card is comfortably in view, so the visitor
    // catches the animation at its start instead of arriving on a finished
    // state. threshold 0 keeps the firing crisp at that boundary.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -38% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView];
}

function BentoLabel({ children, dot = "sky" }) {
  const dotColor = dot === "emerald" ? "bg-emerald-400" : "bg-sky-400";
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-2 w-2">
        <span className={["absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", dotColor].join(" ")} />
        <span className={["relative inline-flex h-2 w-2 rounded-full", dotColor].join(" ")} />
      </span>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-muted">{children}</span>
    </div>
  );
}

function ChatBubble({ side, children }) {
  if (side === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-sky-400 px-3.5 py-2 text-[13px] leading-snug text-ink-950">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] leading-snug text-fg">
        {children}
      </div>
    </div>
  );
}

function TypingDots({ side = "ai" }) {
  if (side === "user") {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-br-md bg-sky-400 px-3.5 py-2.5">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-ink-950/70"
                animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-fg-muted"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const BENTO_CHAT_MESSAGES = [
  { side: "user", key: "user1" },
  { side: "ai", key: "ai1" },
  { side: "user", key: "user2" },
  { side: "ai", key: "ai2" },
  { side: "user", key: "user3" },
  { side: "ai", key: "ai3" },
  { side: "user", key: "user4" },
  { side: "ai", key: "ai4" },
];

function BentoChatbotCard() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [cardRef, inViewOnce] = useTouchInViewOnce();
  const playing = hovered || inViewOnce;
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [typingSide, setTypingSide] = React.useState(null);
  const transcriptRef = React.useRef(null);

  React.useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [visibleCount, typingSide, reduced]);

  React.useEffect(() => {
    if (reduced) {
      setVisibleCount(BENTO_CHAT_MESSAGES.length);
      setTypingSide(null);
      return;
    }
    if (!playing) {
      setVisibleCount(0);
      setTypingSide(null);
      return;
    }

    const TYPING_MS = 720;
    const GAP_MS = 720;
    const LOOP_PAUSE_MS = 2600;
    let timer;

    const step = (i) => {
      if (i >= BENTO_CHAT_MESSAGES.length) {
        timer = setTimeout(() => {
          setVisibleCount(0);
          setTypingSide(null);
          timer = setTimeout(() => step(0), 480);
        }, LOOP_PAUSE_MS);
        return;
      }
      setTypingSide(BENTO_CHAT_MESSAGES[i].side);
      timer = setTimeout(() => {
        setTypingSide(null);
        setVisibleCount(i + 1);
        timer = setTimeout(() => step(i + 1), GAP_MS);
      }, TYPING_MS);
    };

    setVisibleCount(0);
    setTypingSide(null);
    timer = setTimeout(() => step(0), 240);

    return () => clearTimeout(timer);
  }, [playing, reduced]);

  return (
    <BentoCardShell innerRef={cardRef} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <BentoLabel dot="emerald">{t("bento.chatbot.label")}</BentoLabel>
      <h3 className="mt-3 font-display text-[26px] font-semibold leading-[1.1] tracking-tight text-fg sm:text-[30px]">
        {t("bento.chatbot.title")}
      </h3>
      <p className="mt-2.5 max-w-md text-[14.5px] leading-[1.55] text-fg-muted">
        {t("bento.chatbot.description")}
      </p>

      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-400/[0.07] blur-3xl" />

      <div className="mt-auto pt-7">
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3.5 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/15 text-[10px] font-semibold text-sky-400">AI</span>
              <span className="text-[12px] font-medium text-fg">{t("bento.chatbot.ai")}</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-fg-muted">online</span>
          </div>

          <div
            ref={transcriptRef}
            className="h-[280px] overflow-y-auto sm:h-[300px]"
            style={{ scrollbarWidth: "none", maskImage: "linear-gradient(to bottom, transparent 0, #000 28px, #000 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 28px, #000 100%)" }}
          >
            <div className="flex min-h-full flex-col justify-end gap-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {BENTO_CHAT_MESSAGES.slice(0, visibleCount).map((m) => (
                  <motion.div
                    key={m.key}
                    initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.18 } }}
                    transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.55 }}
                  >
                    <ChatBubble side={m.side}>{t(`bento.chatbot.messages.${m.key}`)}</ChatBubble>
                  </motion.div>
                ))}
                {typingSide && !reduced && (
                  <motion.div
                    key={`typing-${typingSide}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <TypingDots side={typingSide} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </BentoCardShell>
  );
}

function BentoAutomationCard() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [cardRef, inViewOnce] = useTouchInViewOnce();
  const playing = hovered || inViewOnce;
  const [done, setDone] = React.useState(0);
  const total = 7;

  React.useEffect(() => {
    if (reduced) {
      setDone(total);
      return;
    }
    if (!playing) {
      setDone(0);
      return;
    }
    const timers = [];
    for (let i = 1; i <= total; i++) {
      timers.push(setTimeout(() => setDone(i), 220 + (i - 1) * 280));
    }
    return () => timers.forEach(clearTimeout);
  }, [playing, reduced]);

  const tasks = [
    t("bento.automation.tasks.t1"),
    t("bento.automation.tasks.t2"),
    t("bento.automation.tasks.t3"),
    t("bento.automation.tasks.t4"),
    t("bento.automation.tasks.t5"),
    t("bento.automation.tasks.t6"),
    t("bento.automation.tasks.t7"),
  ];

  return (
    <BentoCardShell innerRef={cardRef} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <BentoLabel dot={done === total ? "emerald" : "sky"}>{t("bento.automation.label")}</BentoLabel>
      <h3 className="mt-3 font-display text-[22px] font-semibold leading-[1.12] tracking-tight text-fg sm:text-[24px]">
        {t("bento.automation.title")}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-fg-muted">
        {t("bento.automation.description")}
      </p>

      <div className="mt-auto pt-5">
        <div className="rounded-xl border border-white/10 bg-ink-900/70 p-4">
          <ul className="space-y-2.5">
            {tasks.map((task, i) => {
              const isDone = done > i;
              return (
                <li key={i} className="flex items-center gap-2.5">
                  <span
                    className={[
                      "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                      isDone ? "border-emerald-400/70 bg-emerald-400/15" : "border-white/15 bg-white/[0.02]",
                    ].join(" ")}
                  >
                    {isDone && (
                      <motion.svg
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5 text-emerald-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.12 }}
                      >
                        <motion.path
                          d="M2 6.5 L5 9 L10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </motion.svg>
                    )}
                  </span>
                  <span className={["text-[12.5px] transition-colors duration-200", isDone ? "text-fg" : "text-fg-muted"].join(" ")}>{task}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 h-[2px] overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ background: "linear-gradient(90deg, #38BDF8 0%, #3B82F6 60%, #34D399 100%)" }}
              animate={{ scaleX: done / total }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>
    </BentoCardShell>
  );
}

function BentoWebCard() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [cardRef, inViewOnce] = useTouchInViewOnce();
  const playing = hovered || inViewOnce;
  const [lines, setLines] = React.useState(0);
  const codeLines = [
    { tag: "Header", attr: "sticky" },
    { tag: "Hero", attr: "animate" },
    { tag: "Features", attr: "cols={3}" },
    { tag: "Showcase", attr: "loop" },
    { tag: "Stats", attr: "live" },
    { tag: "Testimonials", attr: "" },
    { tag: "Pricing", attr: "tiers={3}" },
    { tag: "CTA", attr: "" },
    { tag: "Footer", attr: "" },
  ];
  const totalLines = codeLines.length;

  React.useEffect(() => {
    if (reduced) {
      setLines(totalLines);
      return;
    }
    if (!playing) {
      setLines(0);
      return;
    }
    const timers = [];
    for (let i = 1; i <= totalLines; i++) {
      timers.push(setTimeout(() => setLines(i), 160 + (i - 1) * 150));
    }
    return () => timers.forEach(clearTimeout);
  }, [playing, reduced, totalLines]);

  return (
    <BentoCardShell innerRef={cardRef} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <BentoLabel>{t("bento.web.label")}</BentoLabel>
      <h3 className="mt-3 font-display text-[22px] font-semibold leading-[1.12] tracking-tight text-fg sm:text-[24px]">
        {t("bento.web.title")}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-fg-muted">
        {t("bento.web.description")}
      </p>

      <div className="mt-auto pt-5">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/80">
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <div className="ml-2 flex flex-1 items-center justify-center rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] tracking-tight text-fg-muted">
              {t("bento.web.url")}
            </div>
          </div>
          <div className="px-3 py-3 font-mono text-[12px] leading-[1.7]">
            {codeLines.map((line, i) => (
              <div
                key={i}
                className={[
                  "flex items-center gap-3 transition-opacity duration-150",
                  lines > i ? "opacity-100" : "opacity-30",
                ].join(" ")}
              >
                <span className="w-3 text-right text-[10px] tabular-nums text-fg-dim">{i + 1}</span>
                <div className="relative overflow-hidden">
                  <motion.span
                    initial={false}
                    animate={{ clipPath: lines > i ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block whitespace-nowrap text-fg"
                  >
                    <span className="text-fg-dim">{"<"}</span>
                    <span className="text-sky-400">{line.tag}</span>
                    {line.attr && <span className="text-fg/70"> {line.attr}</span>}
                    <span className="text-fg-dim">{" />"}</span>
                  </motion.span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BentoCardShell>
  );
}

function BentoFeatures() {
  const { t } = useTranslation();
  return (
    <section id="bento" className="relative py-16 md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="mesh-blob animate-meshShift2 opacity-50"
          style={{ top: "10%", right: "-12%", width: "30rem", height: "30rem", background: "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.16), transparent 70%)" }}
        />
      </div>
      <Container className="relative">
        <SectionHeader
          eyebrow={t("bento.section")}
          title={t("bento.title")}
          description={t("bento.description")}
        />

        <Reveal className="mt-14">
          <div className="grid gap-5 md:grid-cols-3 md:grid-rows-2 md:gap-6">
            <div className="md:col-span-2 md:row-span-2">
              <BentoChatbotCard />
            </div>
            <div className="md:col-span-1 md:row-span-1">
              <BentoWebCard />
            </div>
            <div className="md:col-span-1 md:row-span-1">
              <BentoAutomationCard />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
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
              <MagneticButton href="#demo" variant="primary" demoServices={WEB_CHATBOT_DEMO_SERVICES}>{t("portfolio.getDemo")}</MagneticButton>
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
                <MagneticButton href="#demo" variant="primary" demoServices={WEB_CHATBOT_DEMO_SERVICES}>{t("portfolio.japantok.buttons.requestDemo")}</MagneticButton>
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

function Pricing() {
  const { t } = useTranslation();
  return (
    <section id="pricing" className="relative py-16 md:py-28">
      <Container>
        <SectionHeader eyebrow={t("pricing.section")} title={t("pricing.title")} description={t("pricing.description")} />

        <Reveal className="mt-14">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("pricing.oneTimeSetup")}</h3>
            <Pill>{t("pricing.promoBadge")}</Pill>
          </div>
        </Reveal>

        <StaggerGroup className="mt-7 grid gap-5 lg:grid-cols-4">
          <PriceCard
            title={t("pricing.cards.website.title")}
            badge={t("pricing.cards.website.badge")}
            priceLine={t("pricing.cards.website.price")}
            subLine={t("pricing.cards.website.subLine")}
            desc={t("pricing.cards.website.description")}
            bullets={[
              t("pricing.cards.website.bullets.0"),
              t("pricing.cards.website.bullets.1"),
              t("pricing.cards.website.bullets.2"),
              t("pricing.cards.website.bullets.3"),
            ]}
            cta={t("pricing.cards.website.cta")}
            demoServices={WEBSITE_DEMO_SERVICES}
          />
          <PriceCard
            title={t("pricing.cards.chatbot.title")}
            badge={t("pricing.cards.chatbot.badge")}
            priceLine={
              <span>
                <span className="text-fg-muted/70 line-through">390,000₮</span>{" "}
                <span className="text-fg">195,000₮</span>
              </span>
            }
            subLine={t("pricing.cards.chatbot.subLine")}
            desc={t("pricing.cards.chatbot.description")}
            bullets={[
              t("pricing.cards.chatbot.bullets.0"),
              t("pricing.cards.chatbot.bullets.1"),
              t("pricing.cards.chatbot.bullets.2"),
            ]}
            cta={t("pricing.cards.chatbot.cta")}
            demoServices={CHATBOT_DEMO_SERVICES}
            primary
          />
          <PriceCard
            title={t("pricing.cards.voice.title")}
            badge={t("pricing.cards.voice.badge")}
            priceLine={t("pricing.cards.voice.price")}
            subLine={t("pricing.cards.voice.subLine")}
            desc={t("pricing.cards.voice.description")}
            bullets={[
              t("pricing.cards.voice.bullets.0"),
              t("pricing.cards.voice.bullets.1"),
              t("pricing.cards.voice.bullets.2"),
            ]}
            cta={t("pricing.cards.voice.cta")}
            demoServices={VOICE_DEMO_SERVICES}
          />
          <PriceCard
            title={t("pricing.cards.combo.title")}
            badge={t("pricing.cards.combo.badge")}
            priceLine={t("pricing.cards.combo.price")}
            subLine={t("pricing.cards.combo.subLine")}
            desc={t("pricing.cards.combo.description")}
            bullets={[
              t("pricing.cards.combo.bullets.0"),
              t("pricing.cards.combo.bullets.1"),
              t("pricing.cards.combo.bullets.2"),
            ]}
            cta={t("pricing.cards.combo.cta")}
            demoServices={WEB_CHATBOT_DEMO_SERVICES}
          />
        </StaggerGroup>

        <Reveal className="mt-16">
          <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("pricing.monthly.title")}</h3>
          <p className="mt-2 text-[14.5px] text-fg-muted">{t("pricing.monthly.description")}</p>
        </Reveal>

        <StaggerGroup className="mt-7 grid gap-5 lg:grid-cols-2">
          <StaggerItem>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]">
              <div>
                <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{t("pricing.monthly.chatbot.title")}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-fg-muted">{t("pricing.monthly.chatbot.description")}</p>
              </div>
              {/* Mobile: stacked per-tier blocks. A 3-column comparison table
                  cannot read at 390px (forces ~460px width and scrolls inside
                  the card), so below sm we split into one block per tier with
                  feature/value rows that fit edge-to-edge. */}
              <div className="mt-5 grid gap-4 sm:hidden">
                {[
                  { id: "basic", primary: false },
                  { id: "growth", primary: true },
                ].map(({ id, primary }) => (
                  <div
                    key={id}
                    className={[
                      "rounded-xl p-5",
                      primary
                        ? "border border-sky-400/40 bg-gradient-to-b from-sky-400/[0.06] to-transparent shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_18px_40px_-24px_rgba(56,189,248,0.35)]"
                        : "border border-white/[0.08] bg-white/[0.02]",
                    ].join(" ")}
                  >
                    <p className="font-display text-[15px] font-semibold tracking-tight text-fg">
                      {t(`pricing.monthly.chatbot.table.headers.${id}`)}
                    </p>
                    <dl className="mt-3 divide-y divide-white/[0.06]">
                      {["server", "dataUpdates", "support", "monitoring"].map((row) => (
                        <div key={row} className="flex items-baseline justify-between gap-4 py-2.5">
                          <dt className="text-[12.5px] leading-snug text-fg-muted">
                            {t(`pricing.monthly.chatbot.table.rows.${row}.feature`)}
                          </dt>
                          <dd className="text-right text-[13px] font-medium leading-snug text-fg">
                            {t(`pricing.monthly.chatbot.table.rows.${row}.${id}`)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>

              {/* sm+: original comparison table */}
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-white/[0.08] sm:block">
                <table className="w-full min-w-[460px] text-left text-[13px]">
                  <thead className="bg-white/[0.025]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.feature")}</th>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.basic")}</th>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.growth")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {["server", "dataUpdates", "support", "monitoring"].map((row) => (
                      <tr key={row} className="transition-colors hover:bg-white/[0.015]">
                        <td className="px-4 py-3 text-fg/90">{t(`pricing.monthly.chatbot.table.rows.${row}.feature`)}</td>
                        <td className="px-4 py-3 text-fg/85">{t(`pricing.monthly.chatbot.table.rows.${row}.basic`)}</td>
                        <td className="px-4 py-3 text-fg/85">{t(`pricing.monthly.chatbot.table.rows.${row}.growth`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-fg-muted">{t("pricing.monthly.chatbot.tip")}</p>
                <MagneticButton href="#demo" variant="primary" demoServices={CHATBOT_DEMO_SERVICES}>{t("pricing.monthly.chatbot.cta")}</MagneticButton>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]">
              <div>
                <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{t("pricing.monthly.receptionist.title")}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-fg-muted">{t("pricing.monthly.receptionist.description")}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {["standard", "premium"].map((tier) => {
                  const isPremium = tier === "premium";
                  return (
                    <div
                      key={tier}
                      className={[
                        "relative overflow-hidden rounded-xl p-5 transition-colors",
                        isPremium
                          ? "border border-sky-400/45 bg-gradient-to-b from-sky-400/[0.06] to-transparent shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_24px_50px_-24px_rgba(56,189,248,0.4)]"
                          : "border border-white/[0.08] bg-white/[0.02]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-display text-[15px] font-semibold tracking-tight text-fg">{t(`pricing.monthly.receptionist.${tier}.title`)}</p>
                        <span className="font-display text-[15px] font-semibold text-fg">{t(`pricing.monthly.receptionist.${tier}.price`)}</span>
                      </div>
                      <ul className="mt-4 space-y-2.5 text-[13px] leading-[1.5] text-fg/90">
                        {[0, 1, 2, 3].map((i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <CheckIcon />
                            <span>{t(`pricing.monthly.receptionist.${tier}.features.${i}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end">
                <MagneticButton href="#demo" variant="primary" demoServices={VOICE_DEMO_SERVICES}>{t("pricing.monthly.receptionist.cta")}</MagneticButton>
              </div>
            </div>
          </StaggerItem>
        </StaggerGroup>

        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-800/45 p-7 transition-[border-color,box-shadow] duration-300 hover:border-sky-400/25 hover:shadow-[0_24px_60px_-24px_rgba(56,189,248,0.25)]">
            <div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">{t("pricing.paymentTerms.title")}</p>
                <ul className="mt-5 grid gap-2.5 text-[14px] leading-[1.55] text-fg/90 sm:grid-cols-3 sm:gap-x-6">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span>{t(`pricing.paymentTerms.terms.${i}`)}</span>
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

function ContactOrbField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.55]" />

      <div
        className="contact-orb-glow absolute left-1/2 top-1/2 h-[44rem] w-[44rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.34) 0%, rgba(56,189,248,0.10) 28%, rgba(37,99,235,0.04) 50%, rgba(56,189,248,0) 70%)",
          filter: "blur(48px)",
        }}
      />

      <svg
        className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2"
        viewBox="-200 -200 400 400"
      >
        <circle cx="0" cy="0" r="108" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="0.6" />
        <circle cx="0" cy="0" r="156" fill="none" stroke="rgba(56,189,248,0.13)" strokeWidth="0.6" strokeDasharray="3 9" />
        <circle cx="0" cy="0" r="190" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.6" />
      </svg>

      <div className="contact-orbit contact-orbit-1 absolute left-1/2 top-1/2">
        <span
          className="absolute h-2 w-2 rounded-full bg-sky-300"
          style={{ left: 0, top: 0, transform: "translate(-50%, -50%) translateX(108px)", boxShadow: "0 0 24px 4px rgba(56,189,248,0.85)" }}
        />
      </div>
      <div className="contact-orbit contact-orbit-2 absolute left-1/2 top-1/2">
        <span
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-200"
          style={{ left: 0, top: 0, transform: "translate(-50%, -50%) translateX(156px)", boxShadow: "0 0 18px 3px rgba(56,189,248,0.65)" }}
        />
      </div>
      <div className="contact-orbit contact-orbit-3 absolute left-1/2 top-1/2">
        <span
          className="absolute h-1 w-1 rounded-full bg-white/85"
          style={{ left: 0, top: 0, transform: "translate(-50%, -50%) translateX(190px)", boxShadow: "0 0 14px 2px rgba(255,255,255,0.55)" }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink-950 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}

/* ----------------------------------------------------------- demo request */

/** Options offered as chips, in display order. Keys are shared with the API. */
// The four AI staff from /office come first so a visitor arriving from a desk
// sees their choice at the top of the chips.
const DEMO_SERVICES = ["ara", "nova", "veda", "eho", "website", "chatbot", "voice", "unsure"];

const DEMO_DRAFT_KEY = "dalatech:demo-draft";
/** Pre-selected chips for CTAs whose context already implies a product. */
const WEB_CHATBOT_DEMO_SERVICES = ["website", "chatbot"];
const CHATBOT_DEMO_SERVICES = ["chatbot"];
const VOICE_DEMO_SERVICES = ["voice"];
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
      const base = draft || (current.name || current.phone ? current : EMPTY_DEMO_FORM);
      if (!preset || !preset.length) return base;
      const merged = new Set([...base.services, ...preset.filter((s) => DEMO_SERVICES.includes(s))]);
      return { ...base, services: Array.from(merged) };
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

    // The custom cursor renders far below this dialog, and its stylesheet
    // hides the real one — leaving the desktop visitor with no cursor at all
    // over the form. Hand the native cursor back while we are on top.
    const hadCustomCursor = document.documentElement.classList.contains("has-custom-cursor");
    if (hadCustomCursor) document.documentElement.classList.remove("has-custom-cursor");

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
      if (hadCustomCursor) document.documentElement.classList.add("has-custom-cursor");
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
      <ContactOrbField />

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
              <Link to={l.to} className={linkClass} data-cursor="hover">
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

function Footer({ onOpenPrivacy }) {
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
    { label: t("nav.capabilities"), to: "/products" },
    { label: t("nav.staff"), to: "/office" },
    { label: t("nav.pricing"), to: "/pricing" },
  ];
  const company = [
    { label: t("nav.portfolio"), to: "/portfolio" },
    { label: t("nav.process"), to: "/process" },
    { label: t("nav.location"), to: "/location" },
    { label: t("nav.contact"), onClick: goToContact },
  ];
  const legal = [
    { label: t("footer.privacy"), onClick: onOpenPrivacy },
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
            <p className="text-[12.5px] text-fg-muted/80">{t("footer.builtIn")}</p>
          </div>
          {/* art credits the /office page's licences ask for */}
          <p className="mt-3 text-[11.5px] leading-[1.6] text-fg-dim">
            {t("footer.artCredit")}{" "}
            <a href="https://limezu.itch.io/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-fg-muted">LimeZu</a>
            {" — Modern Interiors · Modern Office"}
          </p>
        </Container>
      </motion.div>
    </footer>
  );
}

function PrivacyTermsModal({ isOpen, onClose }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-terms-title"
        >
          <motion.button
            type="button"
            aria-label="Close Privacy Policy and Terms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-ink-800/95 p-7 shadow-2xl backdrop-blur"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 id="privacy-terms-title" className="font-display text-[22px] font-semibold tracking-tight text-fg">Нууцлалын бодлого ба Үйлчилгээний нөхцөл</h2>
                <p className="text-[13px] text-fg-muted">Хүчин төгөлдөр болсон огноо: 2026 оны 2 дугаар сарын 10</p>
              </div>
              <button type="button" onClick={onClose} className="pressable rounded-full border border-white/10 px-3.5 py-1.5 text-[12.5px] text-fg-muted hover:border-white/20 hover:text-fg">
                Хаах
              </button>
            </div>
            <div className="mt-6 max-h-[70vh] space-y-6 overflow-y-auto pr-2 text-[13.5px] leading-[1.65] text-fg-muted">
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">1. Танилцуулга</h3>
                <p>DalaTech.ai ("бид", "бидний" эсвэл "манай") үйлчилгээнд тавтай морилно уу. Энэхүү үйлчилгээг Монгол Улсад бүртгэлтэй Цэрэнцоодол Билгүүн (Хувиараа эрхлэгч) эзэмшиж, ажиллуулдаг. Манай Facebook Messenger чатботод нэвтрэх буюу ашиглах замаар та энэхүү Үйлчилгээний нөхцөл болон Нууцлалын бодлогыг хүлээн зөвшөөрсөнд тооцогдоно.</p>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">2. Нууцлалын бодлого</h3>
                <p>Бид таны хувийн мэдээллийн нууцлалыг хүндэтгэн, түүнийг хамгаалахыг эрхэмлэдэг.</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Цуглуулдаг мэдээлэл: Бид таны Facebook-ийн нийтийн профайлын мэдээлэл (нэр, профайл зураг) болон чатботод илгээсэн зурвасуудыг цуглуулдаг.</li>
                  <li>Демо хүсэлтийн маягт: dalatech.online дээрх маягтаар илгээсэн нэр, утасны дугаар, бизнесийн нэр болон чиглэл, сонгосон үйлчилгээ, нэмэлт тайлбар, мөн таны сайн дураар үлдээсэн имэйл хаягийг хүлээн авдаг. Түүнчлэн хүсэлт илгээсэн хуудас, хэл, огноог автоматаар тэмдэглэдэг.</li>
                  <li>Мэдээллийг хэрхэн ашигладаг: Бид таны зурвасуудыг зөвхөн Google Gemini API-аар дамжуулан AI хариулт үүсгэхэд ашигладаг. Демо хүсэлтийн мэдээллийг зөвхөн тантай эргэн холбогдож, хүсэлтэд тань хариулахад ашиглана. Таны зөвшөөрөлгүйгээр зар сурталчилгаа, маркетингийн зорилгоор таны мэдээллийг ашиглахгүй.</li>
                  <li>Мэдээлэл хуваалцах: Таны зурвасын өгөгдлийг хариулт үүсгэх зорилгоор Google-ийн AI үйлчилгээ боловсруулах боловч бусад гуравдагч этгээдэд дамжуулагдахгүй, худалдаалагдахгүй.</li>
                  <li>Мэдээлэл устгах: Хэрэв та манай системээс өөрийн мэдээллийг устгуулахыг хүсвэл dalatech.ai@gmail.com хаягаар холбогдох эсвэл чатад "DELETE" гэж хариу бичнэ үү.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">3. Үйлчилгээний нөхцөл</h3>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Ашиглалт: Та энэхүү чатботыг зөвхөн хууль ёсны зорилгоор ашиглахыг зөвшөөрч байна. Хортой, доромжилсон болон хууль бус агуулга илгээхийг хориглоно.</li>
                  <li>Хариуцлага: AI-ийн хариултууд автоматаар үүсгэгддэг. Цэрэнцоодол Билгүүн болон DalaTech.ai нь AI-ийн хариултын алдаа, нарийвчлалгүй мэдээллийн төлөө хариуцлага хүлээхгүй.</li>
                  <li>Үйлчилгээг зогсоох: Энэхүү нөхцөлийг зөрчсөн аливаа хэрэглэгчийг хориглох эрхийг бид өөртөө хадгална.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">4. Холбоо барих мэдээлэл</h3>
                <p>И-мэйл: dalatech.ai@gmail.com</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CapabilityMarquee() {
  const { t } = useTranslation();
  const items = [0, 1, 2, 3, 4, 5].map((i) => t(`marquee.items.${i}`));

  return (
    <section
      aria-label={t("marquee.label")}
      className="marquee-strip relative overflow-hidden border-y border-white/[0.06] bg-white/[0.012] py-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent sm:w-32"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-ink-950 via-ink-950/85 to-transparent sm:w-32"
      />
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 ? "true" : undefined}
            className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
          >
            {items.map((item, i) => (
              <span key={i} className="flex shrink-0 items-center gap-10 sm:gap-14">
                <span className="whitespace-nowrap font-display text-[14px] font-medium tracking-[-0.005em] text-fg-muted sm:text-[15px]">
                  {item}
                </span>
                <span aria-hidden className="block h-1 w-1 rounded-full bg-sky-400/55" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const TECH_STACK = [
  {
    name: "React",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10">
        <g fill="none" stroke="#61DAFB" strokeWidth="1.6">
          <ellipse cx="24" cy="24" rx="16" ry="6" />
          <ellipse cx="24" cy="24" rx="16" ry="6" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="16" ry="6" transform="rotate(-60 24 24)" />
        </g>
        <circle cx="24" cy="24" r="2.6" fill="#61DAFB" />
      </svg>
    ),
  },
  {
    name: "Next.js",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10">
        <circle cx="24" cy="24" r="22" fill="#0A0A0A" stroke="#F0F4FF" strokeOpacity="0.22" />
        <path
          d="M16.4 14.4h2.5v19.2h-2.5zM18.9 14.4h2L31 30.1V14.4h2.5v19.2H31L20.9 17.9v15.7h-2z"
          fill="#F0F4FF"
        />
      </svg>
    ),
  },
  {
    name: "OpenAI",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10" fill="#10A37F">
        <path d="M44.56 19.64a11.97 11.97 0 0 0-1.03-9.82A12.09 12.09 0 0 0 30.51 3.99a12.13 12.13 0 0 0-20.59 4.36 11.97 11.97 0 0 0-8 5.8 12.09 12.09 0 0 0 1.49 14.19A11.96 11.96 0 0 0 4.45 38.16a12.1 12.1 0 0 0 13.03 5.8A11.97 11.97 0 0 0 26.52 48a12.11 12.11 0 0 0 11.55-8.41 11.98 11.98 0 0 0 7.99-5.8 12.11 12.11 0 0 0-1.5-14.15zM26.52 44.86a8.95 8.95 0 0 1-5.75-2.08l.28-.16 9.56-5.52a1.59 1.59 0 0 0 .79-1.36V22.27l4.04 2.34c.05.02.07.06.08.1v11.17a9 9 0 0 1-9 8.98zM7.2 36.61a8.94 8.94 0 0 1-1.07-6.03l.28.17 9.56 5.52a1.54 1.54 0 0 0 1.56 0l11.69-6.74v4.66a.16.16 0 0 1-.07.13l-9.66 5.57a8.99 8.99 0 0 1-12.29-3.28zm-2.5-20.82a8.97 8.97 0 0 1 4.73-3.94v11.36a1.53 1.53 0 0 0 .77 1.35l11.63 6.71-4.04 2.34a.15.15 0 0 1-.14 0l-9.66-5.57a8.99 8.99 0 0 1-3.29-12.25zm33.16 7.69-11.69-6.79 4.04-2.32a.16.16 0 0 1 .14 0l9.66 5.58a8.98 8.98 0 0 1-1.35 16.21V24.82a1.58 1.58 0 0 0-.8-1.34zm4.02-6.04-.28-.17-9.55-5.56a1.55 1.55 0 0 0-1.57 0L18.79 18.45v-4.66a.13.13 0 0 1 .06-.13l9.66-5.57a9 9 0 0 1 13.36 9.32zm-25.31 8.27-4.05-2.33a.16.16 0 0 1-.07-.11V12.15a8.99 8.99 0 0 1 14.74-6.9l-.28.16-9.56 5.51a1.59 1.59 0 0 0-.79 1.37zm2.19-4.73 5.21-3 5.21 3v6L18.86 26z" />
      </svg>
    ),
  },
  {
    name: "Tailwind CSS",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10" fill="#38BDF8">
        <path d="M24 9.6c-6.4 0-10.4 3.2-12 9.6 2.4-3.2 5.2-4.4 8.4-3.6 1.83.46 3.13 1.78 4.58 3.25C27.34 21.24 30.05 24 36 24c6.4 0 10.4-3.2 12-9.6-2.4 3.2-5.2 4.4-8.4 3.6-1.83-.46-3.13-1.78-4.58-3.25C32.66 12.36 29.95 9.6 24 9.6zM12 24c-6.4 0-10.4 3.2-12 9.6 2.4-3.2 5.2-4.4 8.4-3.6 1.83.46 3.13 1.78 4.58 3.25C15.34 35.64 18.05 38.4 24 38.4c6.4 0 10.4-3.2 12-9.6-2.4 3.2-5.2 4.4-8.4 3.6-1.83-.46-3.13-1.78-4.58-3.25C20.66 26.76 17.95 24 12 24z" />
      </svg>
    ),
  },
  {
    name: "Node.js",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10" fill="#5FA04E">
        <path d="M24 0a2.4 2.4 0 0 1 1.21.32l18.7 10.79c.75.43 1.21 1.24 1.21 2.1v21.58c0 .87-.46 1.67-1.21 2.1L25.21 47.68a2.4 2.4 0 0 1-2.42 0L4.09 36.89c-.75-.43-1.21-1.23-1.21-2.1V13.21c0-.86.46-1.67 1.21-2.1L22.79.32A2.4 2.4 0 0 1 24 0zm0 4.32L7.2 14V34l16.8 9.7L40.8 34V14L24 4.32zM20.4 16.32h2.4v15.36H20.4zm4.8 0h1.92l5.28 8.16v-8.16h2.4v15.36H32.4l-4.8-7.44v7.44H25.2z" />
      </svg>
    ),
  },
  {
    name: "Vercel",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-8 w-8 sm:h-9 sm:w-9" fill="#F0F4FF">
        <path d="M24 5L46 43H2L24 5z" />
      </svg>
    ),
  },
  {
    name: "MongoDB",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10" fill="#47A248">
        <path d="M24 2c-1 2-2 4-2 6 0 8 2 14 0 22 0 3-2 8-2 10 2 0 4 2 4 6 0-4 2-6 4-6 0-2-2-7-2-10-2-8 0-14 0-22 0-2-1-4-2-6z" />
      </svg>
    ),
  },
  {
    name: "Framer Motion",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden focusable="false" className="h-9 w-9 sm:h-10 sm:w-10" fill="#FF0080">
        <path d="M10 2h28v14H24l14 14H24v14L10 30V16h14L10 2z" />
      </svg>
    ),
  },
];

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
function LandingPage() {
  return (
    <>
      <Hero />
      <BentoFeatures />
      <Contact />
    </>
  );
}

function ProductsPage() {
  return (
    <PageShell>
      <CapabilityMarquee />
      <Features />
      <BentoFeatures />
      <LiveDemo />
    </PageShell>
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
// /office — the AI staff as one office floor. The picture is a generated
// pixel-art image; OfficeScene animates it. This page owns the zoom, the
// labels placed in the space, the roster and the bundle board.

// World (art pixel) coordinates -> CSS position inside the stage, through the
// camera the scene reports. Labels live in the stage layer so their type never
// scales with the zoom.
function officeStagePoint(view, wx, wy) {
  if (!view) return { left: "50%", top: "50%", opacity: 0 };
  const dpr = view.cw / view.cssW;
  return { left: `${(view.ox + wx * view.scale) / dpr}px`, top: `${(view.oy + wy * view.scale) / dpr}px` };
}
// like officeStagePoint, but keeps a box of the info card's width inside the stage
function officeBoxPoint(view, wx, wy) {
  if (!view) return { left: "50%", top: "50%", opacity: 0 };
  const dpr = view.cw / view.cssW;
  const boxW = Math.min(0.82 * view.cssW, 340);
  const x = (view.ox + wx * view.scale) / dpr;
  const left = Math.min(view.cssW - boxW / 2 - 8, Math.max(boxW / 2 + 8, x));
  return { left: `${left}px`, top: `${(view.oy + wy * view.scale) / dpr}px` };
}
function deskWorld(desk, T) {
  const z = desk.zone;
  // the nameplate and the info box hang from `tag` (the desk front), not the zoom frame
  const tag = desk.tag || { col: z.col + z.cols / 2, row: z.row + z.rows };
  return { cx: tag.col * T, top: z.row * T, bottom: tag.row * T };
}

function OfficeTag({ view, x, y, dim, children, className = "" }) {
  return (
    <div
      className={[
        "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm px-1.5 py-px font-display text-[9px] font-semibold uppercase tracking-[0.16em] transition-opacity duration-300 sm:text-[10px]",
        dim ? "bg-ink-950/55 text-fg-dim/80" : "bg-ink-950/60 text-sky-300/85",
        className,
      ].join(" ")}
      style={officeStagePoint(view, x, y)}
    >
      {children}
    </div>
  );
}

function OfficePriceLine({ id }) {
  const { t } = useTranslation();
  const a = OFFICE_AGENTS[id];
  return (
    <span className="font-display text-[15px] font-semibold tracking-tight text-fg sm:text-[16px]">
      {formatTugrik(a.setup)} <span className="text-[12px] font-normal text-fg-muted">{t("office.setup")}</span>
      {" + "}
      {formatTugrik(a.monthly)}<span className="text-[12px] font-normal text-fg-muted">{t("office.perMonth")}</span>
      {a.perMinute && <span className="text-[12px] font-normal text-fg-muted"> {t("office.plusPerMinute")}</span>}
    </span>
  );
}

function OfficeStage({ activeId, onSelect }) {
  const { t } = useTranslation();
  const { open: openDemoRequest } = useDemoRequest();
  const active = OFFICE_DESKS.find((d) => d.id === activeId) || null;
  const stageRef = React.useRef(null);
  const [view, setView] = React.useState(null);
  const [status, setStatus] = React.useState("loading");
  const T = view ? view.T : 16; // art pixels per tile, reported by the scene

  const onView = React.useCallback((v) => {
    const el = stageRef.current;
    setView({ ...v, cssW: el ? el.getBoundingClientRect().width : v.cw });
  }, []);

  // Escape closes the desk; matches the dialogs elsewhere on the site.
  React.useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onSelect(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onSelect]);

  const hire = () => openDemoRequest([active.id]);

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className="relative mx-auto w-full max-w-[832px] overflow-hidden border border-white/[0.08] bg-ink-950 shadow-card"
        style={{ aspectRatio: `${OFFICE_COLS} / ${OFFICE_ROWS}` }}
      >
        <ErrorBoundary fallback={<div className="flex h-full w-full items-center justify-center text-[13px] text-fg-muted">{t("office.unavailable")}</div>}>
          <React.Suspense fallback={<div className="h-full w-full bg-ink-900" />}>
            <OfficeScene activeDesk={activeId} onSelectDesk={onSelect} onView={onView} onStatus={setStatus} />
          </React.Suspense>
        </ErrorBoundary>
        {status === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80 text-[13px] text-fg-muted">{t("office.unavailable")}</div>
        )}

        {/* nameplates on each desk front, in stage space so the type never scales */}
        {status === "ready" && OFFICE_DESKS.map((d) => {
          const w = deskWorld(d, T);
          return (
            <OfficeTag key={d.id} view={view} x={w.cx} y={w.bottom - 7} dim={!d.live} className={active ? "opacity-0" : "opacity-100"}>
              {t(`office.agents.${d.id}.name`)}
            </OfficeTag>
          );
        })}

        {/* what appears in the space once a desk is open */}
        <AnimatePresence>
          {active && status === "ready" && (
            <React.Fragment key={active.id}>
              <motion.div
                // the centring lives in the motion value: framer resets `transform` once y reaches 0
                initial={{ opacity: 0, y: 6, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%", transition: { delay: 0.3, ...SPRING_REVEAL } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="pointer-events-none absolute w-[min(82%,340px)] border border-sky-400/40 bg-ink-950/90 px-3 py-2 shadow-glow backdrop-blur-sm"
                style={officeBoxPoint(view, deskWorld(active, T).cx, deskWorld(active, T).bottom + 6)}
              >
                <p className="font-display text-[18px] font-semibold leading-tight tracking-tight text-fg sm:text-[20px]">
                  {t(`office.agents.${active.id}.name`)}
                  <span className="ml-2 text-[12px] font-medium uppercase tracking-[0.14em] text-sky-300">{t(`office.agents.${active.id}.role`)}</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.45] text-fg-muted sm:text-[13px]">{t(`office.agents.${active.id}.job`)}</p>
                <p className="mt-2"><OfficePriceLine id={active.id} /></p>
                {OFFICE_AGENTS[active.id].addOnOnly && <p className="mt-1 text-[11px] text-fg-dim">{t("office.addOnOnly")}</p>}
                {!active.live && <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-dim">{t("office.comingSoon")}</p>}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.35, duration: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent px-3 pb-3 pt-8 sm:px-4 sm:pb-4"
              >
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  data-cursor="hover"
                  className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-fg-muted ring-1 ring-inset ring-white/10 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                >
                  <span aria-hidden>←</span> {t("office.back")}
                </button>
                <MagneticButton onClick={hire} variant="primary" className="min-h-[44px]">
                  {active.live ? t("office.hire", { name: t(`office.agents.${active.id}.name`) }) : t("office.preorder")}
                </MagneticButton>
              </motion.div>
            </React.Fragment>
          )}
        </AnimatePresence>

        {!active && status === "ready" && (
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-950/80 px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-fg-muted sm:bottom-3">
            {t("office.tapHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function OfficeRoster({ activeId, onSelect }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06]" role="list">
      {OFFICE_DESKS.map((d) => {
        const active = d.id === activeId;
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : d.id)}
              aria-pressed={active}
              data-cursor="hover"
              className={[
                "flex w-full items-center gap-4 px-2 py-3.5 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:px-3",
                active ? "bg-sky-400/[0.06]" : "hover:bg-white/[0.02]",
              ].join(" ")}
            >
              <span className={["h-2 w-2 shrink-0 rounded-full", d.live ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" : "bg-fg-dim/50"].join(" ")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-[16px] font-semibold tracking-tight text-fg">{t(`office.agents.${d.id}.name`)}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">{t(`office.agents.${d.id}.role`)}</span>
                  {!d.live && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-dim">{t("office.comingSoon")}</span>}
                </span>
                <span className="mt-0.5 block text-[13px] text-fg-muted">{t(`office.agents.${d.id}.job`)}</span>
              </span>
              <span className="hidden shrink-0 text-right sm:block"><OfficePriceLine id={d.id} /></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OfficeBundles() {
  const { t } = useTranslation();
  return (
    <Reveal className="mt-12">
      <div className="border border-white/[0.08] bg-ink-800/45 p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-[20px] font-semibold tracking-tight text-fg">{t("office.bundles.title")}</h3>
          <p className="text-[13px] text-fg-muted">{t("office.bundles.description")}</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {OFFICE_BUNDLES.map((b) => (
            <div key={b.agents} className="border border-white/[0.08] bg-ink-900/60 px-4 py-4">
              <p className="font-display text-[30px] font-semibold leading-none tracking-tightest text-fg">−{Math.round(b.discount * 100)}%</p>
              <p className="mt-2 text-[13px] text-fg-muted">{t("office.bundles.agents", { count: b.agents })}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-fg-dim">{t("office.bundles.note")}</p>
      </div>
    </Reveal>
  );
}

function OfficePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // The open desk lives in the URL, so the browser back button closes it and
  // a shared link opens straight onto a desk.
  const requested = searchParams.get("desk");
  const activeId = OFFICE_DESKS.some((d) => d.id === requested) ? requested : null;
  const select = React.useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("desk", id); else next.delete("desk");
      setSearchParams(next, { replace: !id });
    },
    [searchParams, setSearchParams]
  );

  return (
    <PageShell>
      <section id="office" className="relative py-10 md:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="mesh-blob animate-meshShift opacity-40" style={{ top: "10%", right: "-10%", width: "30rem", height: "30rem", background: "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.10), transparent 70%)" }} />
        </div>
        <Container className="relative">
          <SectionHeader eyebrow={t("office.section")} title={t("office.title")} description={t("office.description")} />
          <div className="-mx-5 mt-10 sm:mx-0 md:mt-14">
            <OfficeStage activeId={activeId} onSelect={select} />
          </div>
          <OfficeRoster activeId={activeId} onSelect={select} />
          <OfficeBundles />
        </Container>
      </section>
    </PageShell>
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
      requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (!el) {
          window.scrollTo({ top: 0, behavior: "auto" });
          return;
        }
        const headerH = window.scrollY > 60 ? 56 : 80;
        const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, location.state]);
  return null;
}

function Shell() {
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-ink-950 text-fg">
      <ErrorBoundary>
        <CustomCursor />
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
                <Route path="/products" element={<ProductsPage />} />
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
        <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />
      </ErrorBoundary>
      <ErrorBoundary>
        <PrivacyTermsModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
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
