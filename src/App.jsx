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

const EASE_OUT = [0.16, 1, 0.3, 1];
const SPRING_REVEAL = { type: "spring", stiffness: 110, damping: 22, mass: 0.6 };
const SPRING_HEADLINE = { type: "spring", stiffness: 140, damping: 18, mass: 0.55 };

function CustomCursor() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.4 });
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
        className="pointer-events-none fixed left-0 top-0 z-[100001] hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg md:block"
        style={{ x, y, opacity: visible ? 1 : 0, scale: hover ? 0.5 : 1 }}
        transition={{ scale: { type: "spring", stiffness: 300, damping: 25 } }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100000] hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/60 mix-blend-difference md:block"
        style={{ x: sx, y: sy, opacity: visible ? 1 : 0, scale: hover ? 1.6 : 1 }}
        transition={{ scale: { type: "spring", stiffness: 220, damping: 20 } }}
      />
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

function NavLink({ children, href, active, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="relative px-1 py-1 text-sm font-medium text-fg-muted transition-colors duration-200 hover:text-fg"
      data-cursor="hover"
    >
      <span className={active ? "text-fg" : ""}>{children}</span>
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-sky-400/0 via-sky-400 to-sky-400/0"
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

function Navbar() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = React.useState("features");
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

  React.useEffect(() => () => clearTimer(), []);

  React.useEffect(() => {
    const ids = ["features", "how", "portfolio", "pricing", "faq", "contact"];
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const y = window.scrollY + 140;
      let cur = "features";
      for (const id of ids) {
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

  const scrollToId = (id) => (e) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActive(id);
  };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING_REVEAL, delay: 0.05 }}
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-300",
        scrolled
          ? "bg-ink-950/65 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <Container>
        <div className={["flex items-center justify-between transition-all duration-300", scrolled ? "h-14" : "h-20"].join(" ")}>
          <a href="#top" className="flex items-center gap-2.5" data-cursor="hover">
            <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-white/10">
              <img src="/Photos/dalatech-logo.png" alt="DalaTech" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-fg">
              {t("nav.brand")}
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink href="#features" active={active === "features"} onClick={scrollToId("features")}>{t("nav.features")}</NavLink>
            <NavLink href="#how" active={active === "how"} onClick={scrollToId("how")}>{t("nav.howItWorks")}</NavLink>
            <NavLink href="#portfolio" active={active === "portfolio"} onClick={scrollToId("portfolio")}>{t("nav.portfolio")}</NavLink>
            <NavLink href="#pricing" active={active === "pricing"} onClick={scrollToId("pricing")}>{t("nav.pricing")}</NavLink>
            <NavLink href="#faq" active={active === "faq"} onClick={scrollToId("faq")}>{t("nav.faq")}</NavLink>
            <NavLink href="#contact" active={active === "contact"} onClick={scrollToId("contact")}>{t("nav.contact")}</NavLink>
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
              onClick={() => setMobileOpen((o) => !o)}
              className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-fg md:hidden"
              aria-label="Toggle menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileOpen ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
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
      </Container>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="md:hidden border-t border-white/5 bg-ink-950/95 backdrop-blur-xl overflow-hidden"
          >
            <Container>
              <nav className="flex flex-col gap-1 py-4">
                {[
                  ["features", t("nav.features")],
                  ["how", t("nav.howItWorks")],
                  ["portfolio", t("nav.portfolio")],
                  ["pricing", t("nav.pricing")],
                  ["faq", t("nav.faq")],
                  ["contact", t("nav.contact")],
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={scrollToId(id)}
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-fg-muted hover:bg-white/[0.03] hover:text-fg"
                  >
                    {label}
                  </a>
                ))}
                <div className="mt-2 flex items-center gap-2 px-3">
                  {LANGUAGES.map(({ code, label }) => (
                    <button
                      key={code}
                      onClick={() => changeLanguage(code)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs",
                        i18n.language === code
                          ? "border-sky-400/40 bg-sky-400/10 text-fg"
                          : "border-white/10 text-fg-muted",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
            </Container>
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

function HeroDemoCard() {
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const yT = useTransform(scrollY, [0, 600], [0, reduced ? 0 : -40]);
  const y = useSpring(yT, { stiffness: 80, damping: 22, mass: 0.4 });

  return (
    <motion.div style={{ y }} className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60 shadow-card">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-400/20 via-transparent to-brand-500/15 [mask:linear-gradient(black,transparent_60%)]" />
        <div className="relative aspect-video w-full">
          <video className="h-full w-full object-cover" autoPlay loop muted playsInline webkit-playsinline="true" preload="auto">
            <source src="/Videos/Matrix_Demo.mov" type="video/mp4" />
            <source src="/Videos/Matrix_Demo.mov" type="video/quicktime" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent" />
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
            </span>
            Live demo
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_REVEAL, delay: 0.9 }}
        className="absolute -bottom-8 left-6 hidden w-72 rounded-2xl border border-white/10 bg-ink-800/85 p-4 shadow-card backdrop-blur md:block"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Example</p>
        <p className="mt-1.5 text-sm text-fg/85">"Do you have brake pads for a 2016 Corolla?"</p>
        <div className="mt-3 rounded-xl bg-fg px-3 py-2 text-xs leading-relaxed text-ink-950">
          Yes — we have multiple options. What brand do you prefer?
        </div>
      </motion.div>
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

function FeatureCard({ index, title, subtitle, bullets, badge, image }) {
  return (
    <StaggerItem>
      <article className="card-glow group flex h-full flex-col rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-display text-[12px] font-semibold tracking-tight text-sky-400">
              {String(index).padStart(2, "0")}
            </span>
            <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{title}</p>
          </div>
          {badge && <Pill>{badge}</Pill>}
        </div>
        <p className="mt-3 text-[14px] leading-[1.6] text-fg-muted">{subtitle}</p>
        <ul className="mt-5 space-y-2.5 text-[13.5px] leading-[1.55] text-fg/85">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {image && (
          <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-ink-900">
            <div className="aspect-[16/10]">
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-transparent" />
          </div>
        )}
      </article>
    </StaggerItem>
  );
}

function StatCard({ label, value }) {
  const m = value.match(/\d+/);
  const num = m ? m[0] : "0";
  const before = value.slice(0, value.indexOf(num));
  const after = value.slice(value.indexOf(num) + num.length);
  return (
    <StaggerItem>
      <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{label}</p>
        <p className="mt-3 font-display text-[36px] font-semibold tracking-tightest text-fg">
          {before}
          <CountUp to={parseInt(num, 10) || 0} />
          {after}
        </p>
      </div>
    </StaggerItem>
  );
}

function Features() {
  const { t } = useTranslation();
  return (
    <section id="features" className="relative py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="mesh-blob animate-meshShift opacity-60" style={{ top: "20%", left: "-10%", width: "32rem", height: "32rem", background: "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.2), transparent 70%)" }} />
      </div>
      <Container className="relative">
        <SectionHeader eyebrow={t("features.section")} title={t("features.title")} description={t("features.description")} />

        <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
          <FeatureCard index={1} title={t("features.chatbot.title")} badge={t("features.chatbot.badge")} subtitle={t("features.chatbot.subtitle")}
            bullets={[t("features.chatbot.bullets.0"), t("features.chatbot.bullets.1"), t("features.chatbot.bullets.2")]}
            image="/Photos/chatbot-feature.png" />
          <FeatureCard index={2} title={t("features.voiceAgent.title")} badge={t("features.voiceAgent.badge")} subtitle={t("features.voiceAgent.subtitle")}
            bullets={[t("features.voiceAgent.bullets.0"), t("features.voiceAgent.bullets.1"), t("features.voiceAgent.bullets.2")]}
            image="/Photos/voice-agent-feature.png" />
          <FeatureCard index={3} title={t("features.fullIntegration.title")} badge={t("features.fullIntegration.badge")} subtitle={t("features.fullIntegration.subtitle")}
            bullets={[t("features.fullIntegration.bullets.0"), t("features.fullIntegration.bullets.1"), t("features.fullIntegration.bullets.2")]}
            image="/Photos/full-integration-feature.png" />
        </StaggerGroup>

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("features.stats.fasterResponses")} value={t("features.stats.fasterResponsesValue")} />
          <StatCard label={t("features.stats.lessRepetitiveWork")} value={t("features.stats.lessRepetitiveWorkValue")} />
          <StatCard label={t("features.stats.betterExperience")} value={t("features.stats.betterExperienceValue")} />
          <StatCard label={t("features.stats.setupTime")} value={t("features.stats.setupTimeValue")} />
        </StaggerGroup>
      </Container>
    </section>
  );
}

function StepCard({ step, title, desc, image }) {
  return (
    <StaggerItem>
      <article className="card-glow group h-full rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 font-display text-[15px] font-semibold tracking-tight text-sky-400">
            {step}
          </span>
          <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{title}</p>
        </div>
        <p className="mt-4 text-[14px] leading-[1.6] text-fg-muted">{desc}</p>
        {image && (
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-ink-900">
            <div className="aspect-[16/10]">
              <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            </div>
          </div>
        )}
      </article>
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
          <StepCard step={t("howItWorks.discovery.step")} title={t("howItWorks.discovery.title")} desc={t("howItWorks.discovery.description")} image="/Photos/discovery-step.png" />
          <StepCard step={t("howItWorks.buildTrain.step")} title={t("howItWorks.buildTrain.title")} desc={t("howItWorks.buildTrain.description")} image="/Photos/train-step.png" />
          <StepCard step={t("howItWorks.launchImprove.step")} title={t("howItWorks.launchImprove.title")} desc={t("howItWorks.launchImprove.description")} image="/Photos/launch-step.png" />
        </StaggerGroup>

        <Reveal className="mt-16">
          <h3 className="font-display text-[22px] font-semibold tracking-tight text-fg">{t("howItWorks.deliverables")}</h3>
          <p className="mt-2 text-[14.5px] text-fg-muted">{t("howItWorks.deliverablesDesc")}</p>
        </Reveal>

        <StaggerGroup className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { title: t("howItWorks.website.title"), desc: t("howItWorks.website.description") },
            { title: t("howItWorks.aiAssistant.title"), desc: t("howItWorks.aiAssistant.description") },
            { title: t("howItWorks.monthlySupport.title"), desc: t("howItWorks.monthlySupport.description") },
          ].map((d) => (
            <StaggerItem key={d.title}>
              <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
                <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{d.title}</p>
                <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">{d.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="mt-14">
          <div className="card-glow flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{t("howItWorks.cta")}</p>
              <p className="mt-1.5 text-[14px] text-fg-muted">{t("howItWorks.ctaDesc")}</p>
            </div>
            <MagneticButton href="#contact" variant="primary">{t("pricing.paymentTerms.cta")}</MagneticButton>
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
              <MagneticButton href="https://japantokmongolia.com/" variant="ghost">{t("portfolio.visitWebsite")}</MagneticButton>
              <MagneticButton href="#contact" variant="primary">{t("portfolio.getDemo")}</MagneticButton>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <a
              href="https://japantokmongolia.com/"
              target="_blank"
              rel="noreferrer"
              className="card-glow group block overflow-hidden rounded-2xl border border-white/10 bg-ink-800/55 p-3 shadow-card"
            >
              <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src="/Photos/japantok-preview.png"
                    alt="JapanTok Mongolia website preview"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-2 pb-2 pt-4">
                <Pill>{t("portfolio.japantok.pills.website")}</Pill>
                <Pill>{t("portfolio.japantok.pills.chatbot")}</Pill>
                <Pill>{t("portfolio.japantok.pills.productQA")}</Pill>
                <Pill>{t("portfolio.japantok.pills.availability")}</Pill>
                <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-400">
                  japantokmongolia.com
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
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
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
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                        <span>{t(`portfolio.japantok.outcomes.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton href="#contact" variant="primary">{t("portfolio.japantok.buttons.requestDemo")}</MagneticButton>
                <MagneticButton href="https://japantokmongolia.com/" variant="ghost">{t("portfolio.japantok.buttons.viewLive")}</MagneticButton>
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
      <div className={["card-glow relative flex h-full flex-col rounded-2xl border bg-ink-800/55 p-6 shadow-card", primary ? "border-sky-400/40" : "border-white/10"].join(" ")}>
        {primary && (
          <span className="absolute -top-2.5 left-6 rounded-full border border-sky-400/40 bg-sky-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-400 backdrop-blur">
            Featured
          </span>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{title}</p>
            {desc && <p className="mt-1.5 text-[13.5px] text-fg-muted">{desc}</p>}
          </div>
          {badge && <Pill>{badge}</Pill>}
        </div>
        <div className="mt-6">
          <p className="font-display text-[28px] font-semibold tracking-tightest text-fg">{priceLine}</p>
          {subLine && <p className="mt-2 text-[13px] text-fg-muted">{subLine}</p>}
        </div>
        <ul className="mt-6 space-y-2.5 text-[13.5px] text-fg/85">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-7 pt-2">
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
            <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
              <div>
                <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{t("pricing.monthly.chatbot.title")}</p>
                <p className="mt-1.5 text-[13.5px] text-fg-muted">{t("pricing.monthly.chatbot.description")}</p>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.feature")}</th>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.basic")}</th>
                      <th className="px-4 py-3 font-semibold text-fg-muted">{t("pricing.monthly.chatbot.table.headers.growth")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {["server", "dataUpdates", "support", "monitoring"].map((row) => (
                      <tr key={row}>
                        <td className="px-4 py-3 text-fg/85">{t(`pricing.monthly.chatbot.table.rows.${row}.feature`)}</td>
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
            <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
              <div>
                <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{t("pricing.monthly.receptionist.title")}</p>
                <p className="mt-1.5 text-[13.5px] text-fg-muted">{t("pricing.monthly.receptionist.description")}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {["standard", "premium"].map((tier) => (
                  <div key={tier} className={["rounded-xl border p-5", tier === "premium" ? "border-sky-400/40 bg-sky-400/[0.04]" : "border-white/10 bg-white/[0.02]"].join(" ")}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-[15px] font-semibold tracking-tight text-fg">{t(`pricing.monthly.receptionist.${tier}.title`)}</p>
                      <span className="font-display text-[15px] font-semibold text-fg">{t(`pricing.monthly.receptionist.${tier}.price`)}</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-[13px] text-fg/85">
                      {[0, 1, 2, 3].map((i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                          <span>{t(`pricing.monthly.receptionist.${tier}.features.${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <MagneticButton href="#contact" variant="primary">{t("pricing.monthly.receptionist.cta")}</MagneticButton>
              </div>
            </div>
          </StaggerItem>
        </StaggerGroup>

        <Reveal className="mt-14">
          <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card">
            <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{t("pricing.paymentTerms.title")}</p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-fg/85">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                  <span>{t(`pricing.paymentTerms.terms.${i}`)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-fg-muted">{t("pricing.paymentTerms.note")}</p>
              <MagneticButton href="#contact" variant="primary">{t("contact.title")}</MagneticButton>
            </div>
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
      <div className={["card-glow rounded-2xl border bg-ink-800/55 shadow-card", open ? "border-sky-400/30" : "border-white/10"].join(" ")}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="pressable flex w-full items-start justify-between gap-5 p-6 text-left"
        >
          <p className="font-display text-[15.5px] font-semibold tracking-tight text-fg">{question}</p>
          <span className={["mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-fg transition-all duration-300", open ? "rotate-45 border-sky-400/40 bg-sky-400/10 text-sky-400" : "border-white/10 bg-white/[0.03]"].join(" ")}>
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
              transition={{ height: { duration: 0.32, ease: EASE_OUT }, opacity: { duration: 0.22, ease: EASE_OUT } }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-6 text-[14px] leading-[1.65] text-fg-muted">{answer}</p>
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
    <section id="faq" className="relative py-28">
      <Container>
        <SectionHeader eyebrow={t("faq.section")} title={t("faq.title")} description={t("faq.description")} />

        <StaggerGroup className="mt-14 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <FAQItem key={n} question={t(`faq.q${n}.question`)} answer={t(`faq.q${n}.answer`)} />
          ))}
        </StaggerGroup>

        <Reveal className="mt-12">
          <div className="card-glow flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-[16px] font-semibold tracking-tight text-fg">{t("faq.stillHaveQuestions")}</p>
              <p className="mt-1.5 text-[14px] text-fg-muted">{t("faq.contactPrompt")}</p>
            </div>
            <MagneticButton href="#contact" variant="primary">{t("faq.talkToUs")}</MagneticButton>
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
            <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-7 shadow-card">
              <p className="font-display text-[17px] font-semibold tracking-tight text-fg">{t("contact.form.title")}</p>
              <p className="mt-1.5 text-[14px] text-fg-muted">{t("contact.form.description")}</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.nameLabel")}</label>
                    <input name="name" required placeholder={t("contact.form.namePlaceholder")} className="field mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.businessLabel")}</label>
                    <input name="business" required placeholder={t("contact.form.businessPlaceholder")} className="field mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.phoneLabel")}</label>
                    <input name="phone" required placeholder={t("contact.form.phonePlaceholder")} className="field mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.serviceLabel")}</label>
                    <select name="service" defaultValue="Website + AI Chatbot" className="field mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm">
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteOnly")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteChatbot")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.chatbotOnly")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteVoice")}</option>
                      <option className="bg-ink-800">{t("contact.form.serviceOptions.websiteBoth")}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{t("contact.form.messageLabel")}</label>
                  <textarea name="message" rows={5} placeholder={t("contact.form.messagePlaceholder")} className="field mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm" />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <MagneticButton type="submit" variant="primary">{t("contact.form.submitButton")}</MagneticButton>
                  <p className="text-[11.5px] leading-[1.55] text-fg-muted">{t("contact.form.consentText")}</p>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://www.facebook.com/profile.php?id=61586065058744" target="_blank" rel="noreferrer" className="pressable rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-fg/90 transition-colors hover:border-white/20">
                  {t("contact.form.facebookButton")}
                </a>
                <a href="mailto:dalatech.ai@gmail.com" className="pressable rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-fg/90 transition-colors hover:border-white/20">
                  {t("contact.form.emailButton")}
                </a>
              </div>
            </div>
          </Reveal>

          <StaggerGroup className="space-y-5">
            {[1, 2, 3].map((n) => (
              <StaggerItem key={n}>
                <div className="card-glow flex gap-5 rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] font-display text-[13px] font-semibold tracking-tight text-sky-400">
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
              <div className="card-glow rounded-2xl border border-white/10 bg-ink-800/55 p-6 shadow-card">
                <p className="font-display text-[15.5px] font-semibold tracking-tight text-fg">{t("contact.responseTime.title")}</p>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-fg-muted">{t("contact.responseTime.description")}</p>
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

function Footer({ onOpenPrivacy }) {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <Container>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-[13px] text-fg-muted">
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-md ring-1 ring-white/10">
              <img src="/Photos/dalatech-logo.png" alt="DalaTech" className="h-full w-full object-cover" />
            </span>
            {new Date().getFullYear()} DalaTech.
          </div>
          <button type="button" onClick={onOpenPrivacy} className="text-[13px] text-fg-muted transition-colors hover:text-fg">
            Privacy & Terms
          </button>
        </div>
      </Container>
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

export default function App() {
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState("home");

  React.useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = "auto"; };
  }, []);

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
