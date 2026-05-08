import React from "react";
import { useTranslation } from "react-i18next";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
  useInView as useFmInView,
} from "framer-motion";
import Setup from "./Setup";
import Globe from "./Globe";

const EASE_OUT = [0.16, 1, 0.3, 1];
const SPRING_REVEAL = { type: "spring", stiffness: 110, damping: 22, mass: 0.6 };
const SPRING_HEADLINE = { type: "spring", stiffness: 140, damping: 18, mass: 0.55 };

function CustomCursor() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 200, damping: 28, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 200, damping: 28, mass: 0.5 });
  const [hover, setHover] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    document.documentElement.classList.add("has-custom-cursor");

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visible) setVisible(true);
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
  }, [reduced, visible, x, y]);

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

function MagneticButton({ children, href = "#", variant = "primary", onClick, type = "button", className = "" }) {
  const reduced = useReducedMotion();
  const ref = React.useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.5 });

  const onMove = (e) => {
    if (reduced || !ref.current) return;
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
      className={[base, styles, className].join(" ")}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.45), 0 16px 40px -8px rgba(56,189,248,0.45)" }}
        />
      )}
    </motion.span>
  );

  if (onClick || type === "submit") {
    return (
      <motion.button
        type={type}
        onClick={onClick}
        className="inline-block"
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        {Inner}
      </motion.button>
    );
  }

  return (
    <motion.a
      href={href}
      className="inline-block"
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {Inner}
    </motion.a>
  );
}

function MeshBackground({ intensity = 1 }) {
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

function CountUp({ to, prefix = "", suffix = "", duration = 1400 }) {
  const ref = React.useRef(null);
  const inView = useFmInView(ref, { once: true, amount: 0.4 });
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(Math.round(ease(t) * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{prefix}{val}{suffix}</span>;
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

function NavLink({ children, href, active, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={[
        "relative px-1 py-2 text-[14px] font-medium transition-colors duration-200",
        active ? "text-[#38BDF8]" : "text-fg-muted hover:text-fg",
      ].join(" ")}
      data-cursor="hover"
    >
      <span>{children}</span>
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-[#38BDF8]"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
    </a>
  );
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "mn", label: "Монгол" },
  { code: "zh-TW", label: "繁體中文" },
];

const NAV_ITEMS = [
  { id: "bento", labelKey: "capabilities" },
  { id: "process", labelKey: "process" },
  { id: "tech-stack", labelKey: "stack" },
  { id: "location", labelKey: "location" },
  { id: "portfolio", labelKey: "portfolio" },
  { id: "pricing", labelKey: "pricing" },
  { id: "faq", labelKey: "faq" },
];

const SCROLLSPY_IDS = [
  "bento",
  "process",
  "tech-stack",
  "location",
  "features",
  "how",
  "portfolio",
  "pricing",
  "faq",
  "contact",
];

function Navbar() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = React.useState("bento");
  const [scrolled, setScrolled] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const langTimer = React.useRef(null);
  const programmaticScroll = React.useRef(false);
  const programmaticEndTimer = React.useRef(null);

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

  React.useEffect(() => () => clearTimer(), []);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      if (programmaticScroll.current) return;
      const y = window.scrollY + 140;
      let cur = "bento";
      for (const id of SCROLLSPY_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (y >= el.offsetTop) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const scrollToId = (id) => (e) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = window.scrollY > 60 ? 56 : 80;
    const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
    setActive(id);
    programmaticScroll.current = true;
    if (programmaticEndTimer.current) clearTimeout(programmaticEndTimer.current);
    let lastY = window.scrollY;
    let still = 0;
    const watch = () => {
      if (Math.abs(window.scrollY - lastY) < 0.5) {
        still += 1;
      } else {
        still = 0;
        lastY = window.scrollY;
      }
      if (still >= 4) {
        programmaticScroll.current = false;
        return;
      }
      programmaticEndTimer.current = setTimeout(watch, 80);
    };
    window.scrollTo({ top: y, behavior: "smooth" });
    programmaticEndTimer.current = setTimeout(watch, 80);
  };

  const navLabel = (labelKey) => t(`nav.${labelKey}`);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING_REVEAL, delay: 0.05 }}
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
        <div className={["flex items-center justify-between transition-all duration-300", scrolled ? "h-14" : "h-20"].join(" ")}>
          <a href="#top" className="flex shrink-0 items-center" data-cursor="hover" aria-label="DalaTech home">
            <BrandLockup size={40} />
          </a>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex lg:gap-7">
            {NAV_ITEMS.map(({ id, labelKey }) => (
              <NavLink
                key={id}
                href={`#${id}`}
                active={active === id}
                onClick={scrollToId(id)}
              >
                {navLabel(labelKey)}
              </NavLink>
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
              <MagneticButton href="#contact" variant="primary">
                {t("nav.getDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="fixed inset-0 z-[100] flex flex-col bg-ink-950/98 backdrop-blur-xl md:hidden"
            style={{ backgroundColor: "rgba(5,10,24,0.98)" }}
          >
            <div className="flex items-center justify-between px-5 pt-5 sm:px-7">
              <a href="#top" onClick={scrollToId("top")} className="flex items-center" aria-label="DalaTech home">
                <BrandLockup size={40} />
              </a>
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
              {NAV_ITEMS.map(({ id, labelKey }) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  onClick={scrollToId(id)}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: SPRING_REVEAL },
                  }}
                  className={[
                    "block py-1 font-display font-semibold tracking-tight transition-colors",
                    active === id ? "text-[#38BDF8]" : "text-fg hover:text-[#38BDF8]",
                  ].join(" ")}
                  style={{ fontSize: "40px", lineHeight: 1.08, letterSpacing: "-0.02em" }}
                >
                  {navLabel(labelKey)}
                </motion.a>
              ))}
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
              <MagneticButton href="#contact" variant="primary" onClick={(e) => { scrollToId("contact")(e); }}>
                {t("nav.getDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

function FloatingChatbotBadge() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING_REVEAL, delay: 1.0 }}
      className="absolute bottom-3.5 right-3.5 z-10 flex items-end gap-2.5 sm:bottom-5 sm:right-5"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...SPRING_REVEAL, delay: 1.4 }}
        className="hidden max-w-[210px] rounded-2xl rounded-br-md border border-white/10 bg-ink-900/95 px-3 py-2 shadow-[0_20px_44px_-18px_rgba(0,0,0,0.75)] backdrop-blur md:block"
      >
        <p className="text-[11px] leading-[1.45] text-fg/90">Сайн байна уу 👋 Ямар үйлчилгээ авах вэ?</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-sky-300">DalaTech AI</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span className="text-[9px] text-fg-muted">Live</span>
        </div>
      </motion.div>
      <motion.button
        type="button"
        aria-label="DalaTech AI chatbot"
        animate={reduced ? undefined : { y: [0, -3, 0] }}
        transition={reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={reduced ? undefined : { scale: 1.04 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
        className="pressable relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 shadow-[0_18px_44px_-12px_rgba(56,189,248,0.55)] sm:h-12 sm:w-12"
        style={{ background: "linear-gradient(155deg, #38BDF8 0%, #2563EB 100%)" }}
      >
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-ink-950 bg-emerald-400" />
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

function HeroDemoCard() {
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const yT = useTransform(scrollY, [0, 600], [0, reduced ? 0 : -36]);
  const y = useSpring(yT, { stiffness: 80, damping: 22, mass: 0.4 });

  return (
    <motion.div style={{ y }} className="relative">
      <BrowserMockup url="matrixecosalon.org">
        <MatrixSalonPreview />
      </BrowserMockup>
      <FloatingChatbotBadge />
      <div
        aria-hidden
        className="pointer-events-none absolute left-4 top-[58px] z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted backdrop-blur sm:top-[62px]"
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
    <section id="top" className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-36">
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
              <MagneticButton href="#contact" variant="primary">
                {t("hero.buttons.getDemo")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </MagneticButton>
              <MagneticButton href="#portfolio" variant="ghost">
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

function BentoCardShell({ children, onPointerEnter, onPointerLeave, className = "" }) {
  return (
    <div
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={["card-glow group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-800/55 p-6 shadow-card sm:p-7", className].join(" ")}
    >
      {children}
    </div>
  );
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

function TypingDots() {
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

function BentoChatbotCard() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    if (!hovered || reduced) {
      setStage(0);
      return;
    }
    const schedule = [
      [280, 1],
      [580, 2],
      [1380, 3],
      [2200, 4],
      [2480, 5],
      [3280, 6],
      [4080, 7],
      [4360, 8],
      [5160, 9],
    ];
    const timers = schedule.map(([ms, s]) => setTimeout(() => setStage(s), ms));
    return () => timers.forEach(clearTimeout);
  }, [hovered, reduced]);

  return (
    <BentoCardShell onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
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

          <div className="flex flex-col gap-2.5">
            <ChatBubble side="user">{t("bento.chatbot.messages.user1")}</ChatBubble>
            <ChatBubble side="ai">{t("bento.chatbot.messages.ai1")}</ChatBubble>

            <AnimatePresence mode="popLayout" initial={false}>
              {stage >= 1 && (
                <motion.div
                  key="user2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ChatBubble side="user">{t("bento.chatbot.messages.user2")}</ChatBubble>
                </motion.div>
              )}
              {stage === 2 && (
                <motion.div
                  key="typing1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TypingDots />
                </motion.div>
              )}
              {stage >= 3 && (
                <motion.div
                  key="ai2"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.55 }}
                >
                  <ChatBubble side="ai">{t("bento.chatbot.messages.ai2")}</ChatBubble>
                </motion.div>
              )}
              {stage >= 4 && (
                <motion.div
                  key="user3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ChatBubble side="user">{t("bento.chatbot.messages.user3")}</ChatBubble>
                </motion.div>
              )}
              {stage === 5 && (
                <motion.div
                  key="typing2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TypingDots />
                </motion.div>
              )}
              {stage >= 6 && (
                <motion.div
                  key="ai3"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.55 }}
                >
                  <ChatBubble side="ai">{t("bento.chatbot.messages.ai3")}</ChatBubble>
                </motion.div>
              )}
              {stage >= 7 && (
                <motion.div
                  key="user4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ChatBubble side="user">{t("bento.chatbot.messages.user4")}</ChatBubble>
                </motion.div>
              )}
              {stage === 8 && (
                <motion.div
                  key="typing3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TypingDots />
                </motion.div>
              )}
              {stage >= 9 && (
                <motion.div
                  key="ai4"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.55 }}
                >
                  <ChatBubble side="ai">{t("bento.chatbot.messages.ai4")}</ChatBubble>
                </motion.div>
              )}
            </AnimatePresence>
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
  const [done, setDone] = React.useState(0);
  const total = 7;

  React.useEffect(() => {
    if (reduced) {
      setDone(total);
      return;
    }
    if (!hovered) {
      setDone(0);
      return;
    }
    const timers = [];
    for (let i = 1; i <= total; i++) {
      timers.push(setTimeout(() => setDone(i), 220 + (i - 1) * 280));
    }
    return () => timers.forEach(clearTimeout);
  }, [hovered, reduced]);

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
    <BentoCardShell onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
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
    if (!hovered) {
      setLines(0);
      return;
    }
    const timers = [];
    for (let i = 1; i <= totalLines; i++) {
      timers.push(setTimeout(() => setLines(i), 160 + (i - 1) * 150));
    }
    return () => timers.forEach(clearTimeout);
  }, [hovered, reduced, totalLines]);

  return (
    <BentoCardShell onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
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
    <section id="bento" className="relative py-24 md:py-28">
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
    <section id="process" ref={ref} className="relative py-24 md:py-28">
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
              <MagneticButton href="#contact" variant="primary">{t("pricing.paymentTerms.cta")}</MagneticButton>
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
    <section id="portfolio" className="relative py-28">
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
              <MagneticButton href="#contact" variant="primary">{t("portfolio.getDemo")}</MagneticButton>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <a
              href="https://matrixecosalon.org"
              target="_blank"
              rel="noreferrer"
              className="group block"
              data-cursor="hover"
            >
              <div className="relative">
                <BrowserMockup url="matrixecosalon.org">
                  <MatrixSalonPreview />
                </BrowserMockup>
                <FloatingChatbotBadge />
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
                <MagneticButton href="#contact" variant="primary">{t("portfolio.japantok.buttons.requestDemo")}</MagneticButton>
                <MagneticButton href="https://matrixecosalon.org" variant="ghost">{t("portfolio.japantok.buttons.viewLive")}</MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function PriceCard({ title, badge, priceLine, subLine, desc, bullets, cta, primary, footnote }) {
  return (
    <StaggerItem>
      <div
        className={[
          "relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5",
          primary
            ? "border border-sky-400/55 bg-gradient-to-b from-sky-400/[0.06] to-ink-800/65 shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_30px_70px_-30px_rgba(56,189,248,0.55)] hover:shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_40px_80px_-30px_rgba(56,189,248,0.7)]"
            : "border border-white/[0.08] bg-ink-800/45 hover:border-white/20 hover:shadow-[0_24px_56px_-24px_rgba(8,12,28,0.7)]",
        ].join(" ")}
      >
        {primary && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -top-px left-1/2 h-[2px] w-3/4 -translate-x-1/2 rounded-full"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.85) 50%, transparent 100%)" }}
            />
            <span className="absolute -top-2.5 left-6 rounded-full border border-sky-400/50 bg-sky-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200 backdrop-blur">
              Featured
            </span>
          </>
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
          <MagneticButton href="#contact" variant={primary ? "primary" : "ghost"} className="w-full">{cta}</MagneticButton>
        </div>
        {footnote && <p className="mt-4 text-[11px] leading-[1.55] text-fg-muted/80">{footnote}</p>}
      </div>
    </StaggerItem>
  );
}

function Pricing() {
  const { t } = useTranslation();
  return (
    <section id="pricing" className="relative py-28">
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
              <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]">
                <table className="w-full text-left text-[13px]">
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
                <MagneticButton href="#contact" variant="primary">{t("pricing.monthly.chatbot.cta")}</MagneticButton>
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
                <MagneticButton href="#contact" variant="primary">{t("pricing.monthly.receptionist.cta")}</MagneticButton>
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
              <MagneticButton href="#contact" variant="primary">{t("contact.title")}</MagneticButton>
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
              <MagneticButton href="#contact" variant="primary">{t("faq.talkToUs")}</MagneticButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function Contact() {
  const { t } = useTranslation();

  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name")?.toString().trim() || "-",
      business: form.get("business")?.toString().trim() || "-",
      phone: form.get("phone")?.toString().trim() || "-",
      service: form.get("service")?.toString().trim() || "-",
      message: form.get("message")?.toString().trim() || "-",
    };
    fetch("https://formspree.io/f/xqeekjap", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          alert(t("contact.form.successMessage"));
          e.currentTarget.reset();
          return;
        }
        return response.json().then((d) => { throw new Error(d.error || "Form submission failed"); });
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(t("contact.form.errorMessage"));
      });
  }

  return (
    <section id="contact" className="relative py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="mesh-blob animate-meshShift opacity-50" style={{ top: "0%", right: "-10%", width: "40rem", height: "40rem", background: "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.18), transparent 70%)" }} />
      </div>
      <Container className="relative">
        <SectionHeader eyebrow={t("contact.sectionLabel")} title={t("contact.title")} description={t("contact.description")} />

        <div className="mt-14 grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-800/45 p-7 transition-[border-color,box-shadow] duration-300 hover:border-white/15 hover:shadow-[0_30px_70px_-30px_rgba(8,12,28,0.7)]">
              <p className="font-display text-[18px] font-semibold tracking-tight text-fg">{t("contact.form.title")}</p>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-fg-muted">{t("contact.form.description")}</p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.nameLabel")}</span>
                    <input name="name" required placeholder={t("contact.form.namePlaceholder")} className="field mt-2.5 w-full rounded-xl px-3.5 py-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.businessLabel")}</span>
                    <input name="business" required placeholder={t("contact.form.businessPlaceholder")} className="field mt-2.5 w-full rounded-xl px-3.5 py-3 text-sm" />
                  </label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.phoneLabel")}</span>
                    <input name="phone" required placeholder={t("contact.form.phonePlaceholder")} className="field mt-2.5 w-full rounded-xl px-3.5 py-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.serviceLabel")}</span>
                    <select name="service" defaultValue="Website + AI Chatbot" className="field mt-2.5 w-full rounded-xl px-3.5 py-3 text-sm">
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteOnly")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteChatbot")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.chatbotOnly")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteVoice")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteBoth")}</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.messageLabel")}</span>
                  <textarea name="message" rows={5} placeholder={t("contact.form.messagePlaceholder")} className="field mt-2.5 w-full rounded-xl px-3.5 py-3 text-sm" />
                </label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <MagneticButton type="submit" variant="primary">
                    {t("contact.form.submitButton")}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </MagneticButton>
                  <p className="max-w-[34ch] text-[11.5px] leading-[1.55] text-fg-muted">{t("contact.form.consentText")}</p>
                </div>
              </form>

              <div className="mt-7 flex flex-wrap gap-3 border-t border-white/[0.06] pt-5">
                <a href="https://www.facebook.com/profile.php?id=61586065058744" target="_blank" rel="noreferrer" className="pressable inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-fg/90 transition-colors hover:border-sky-400/30 hover:bg-sky-400/[0.04] hover:text-fg" data-cursor="hover">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3V22A10 10 0 0 0 22 12z"/></svg>
                  {t("contact.form.facebookButton")}
                </a>
                <a href="mailto:dalatech.ai@gmail.com" className="pressable inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-fg/90 transition-colors hover:border-sky-400/30 hover:bg-sky-400/[0.04] hover:text-fg" data-cursor="hover">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  {t("contact.form.emailButton")}
                </a>
              </div>
            </div>
          </Reveal>

          <StaggerGroup className="space-y-4" stagger={0.08}>
            {[1, 2, 3].map((n) => (
              <StaggerItem key={n}>
                <div className="group flex gap-5 rounded-2xl border border-white/[0.08] bg-ink-800/45 p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-[0_24px_56px_-24px_rgba(56,189,248,0.28)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 font-display text-[13px] font-semibold tracking-tight text-sky-400 transition-colors group-hover:border-sky-400/50 group-hover:bg-sky-400/15">
                    {String(n).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-[15.5px] font-semibold tracking-tight text-fg">{t(`contact.steps.step${n}.title`)}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.6] text-fg-muted">{t(`contact.steps.step${n}.description`)}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
            <StaggerItem>
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sky-400/[0.05] to-ink-800/45 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  <p className="font-display text-[15.5px] font-semibold tracking-tight text-fg">{t("contact.responseTime.title")}</p>
                </div>
                <p className="mt-3 text-[14px] leading-[1.6] text-fg-muted">{t("contact.responseTime.description")}</p>
              </div>
            </StaggerItem>
          </StaggerGroup>
        </div>
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
                className="text-[13.5px] text-fg/85 transition-colors duration-200 hover:text-sky-300"
                data-cursor="hover"
              >
                {l.label}
              </button>
            ) : (
              <a
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="text-[13.5px] text-fg/85 transition-colors duration-200 hover:text-sky-300"
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

  const services = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.howItWorks"), href: "#how" },
    { label: t("nav.capabilities"), href: "#bento" },
    { label: t("nav.pricing"), href: "#pricing" },
  ];
  const company = [
    { label: t("nav.portfolio"), href: "#portfolio" },
    { label: t("nav.process"), href: "#process" },
    { label: t("nav.location"), href: "#location" },
    { label: t("nav.contact"), href: "#contact" },
  ];
  const legal = [
    { label: t("footer.privacy"), onClick: onOpenPrivacy },
    { label: t("nav.faq"), href: "#faq" },
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
                  rel="noreferrer"
                  aria-label="DalaTech on Facebook"
                  data-cursor="hover"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-fg-muted transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3V22A10 10 0 0 0 22 12z" />
                  </svg>
                </a>
                <a
                  href="mailto:bilguunbilly0214@gmail.com"
                  aria-label="Email DalaTech"
                  data-cursor="hover"
                  className="pressable inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12.5px] font-medium text-fg/85 transition-[border-color,color,background-color] duration-200 hover:border-sky-400/40 hover:bg-sky-400/[0.06] hover:text-sky-300"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  bilguunbilly0214@gmail.com
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
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
                <h2 className="font-display text-[22px] font-semibold tracking-tight text-fg">Privacy Policy & Terms of Service</h2>
                <p className="text-[13px] text-fg-muted">Effective Date: February 10, 2026</p>
              </div>
              <button type="button" onClick={onClose} className="pressable rounded-full border border-white/10 px-3.5 py-1.5 text-[12.5px] text-fg-muted hover:border-white/20 hover:text-fg">
                Close
              </button>
            </div>
            <div className="mt-6 max-h-[70vh] space-y-6 overflow-y-auto pr-2 text-[13.5px] leading-[1.65] text-fg-muted">
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">1. Introduction</h3>
                <p>Welcome to DalaTech.ai ("we," "our," or "us"). This service is owned and operated by Tserentsoodol Bilguun (Sole Proprietorship), registered in Mongolia. By accessing or using our Facebook Messenger chatbot, you agree to these Terms and our Privacy Policy.</p>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">2. Privacy Policy</h3>
                <p>We respect your privacy and are committed to protecting your personal data.</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Data We Collect: We collect your public Facebook profile information (name, profile picture) and the messages you send to our chatbot.</li>
                  <li>How We Use Data: We use your messages solely to provide AI-generated responses via the Google Gemini API. We do not use your data for advertising or marketing purposes without your consent.</li>
                  <li>Data Sharing: Your message data is processed by Google's AI services to generate replies but is not shared with any other third parties or sold.</li>
                  <li>Data Deletion: If you wish to delete your data from our system, please contact us at bilguunbilly0214@gmail.com or reply "DELETE" in the chat.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">3. Terms of Service</h3>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Usage: You agree to use this chatbot only for lawful purposes. You must not send harmful, offensive, or illegal content.</li>
                  <li>Liability: The AI responses are generated automatically. Tserentsoodol Bilguun and DalaTech.ai are not liable for any inaccuracies in the AI's answers.</li>
                  <li>Termination: We reserve the right to block any user who violates these terms.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-[16px] font-semibold text-fg">4. Contact Information</h3>
                <p>Owner: Tserentsoodol Bilguun Address: Khan-Uul, Artsat apartment, 801, Ulaanbaatar, Mongolia Phone: +976 99273339 Email: bilguunbilly0214@gmail.com</p>
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
    <section id="tech-stack" className="relative py-24 md:py-28">
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
      className="relative py-24 md:py-28"
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
            <Globe reducedMotion={reduced} />
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

export default function App() {
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState("home");

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(window.location.hash === "#/setup" ? "setup" : "home");
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (currentPage === "setup") return <Setup />;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950 text-fg">
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <CapabilityMarquee />
        <BentoFeatures />
        <ProcessTimeline />
        <TechStack />
        <LocationBadge />
        <Features />
        <HowItWorks />
        <Portfolio />
        <Pricing />
        <FAQ />
        <Contact />
      </main>
      <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />
      <PrivacyTermsModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <Chatbot />
    </div>
  );
}
