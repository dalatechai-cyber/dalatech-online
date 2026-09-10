import React from "react";
import { createOffice } from "./office/engine";

/**
 * Mounts the office engine on a canvas that fills its parent, sizes it to the
 * parent in device pixels, pauses it when off screen, forwards taps and
 * pointer movement, and reports the establishing scroll progress.
 *
 * Lazy-loaded: three.js and the models only arrive on /office.
 */
export default function OfficeScene({ activeDesk, onSelectDesk, onStatus, onHover, labelRefs }) {
  const canvasRef = React.useRef(null);
  const engineRef = React.useRef(null);
  const onStatusRef = React.useRef(onStatus);
  const onHoverRef = React.useRef(onHover);
  const activeRef = React.useRef(activeDesk);
  onStatusRef.current = onStatus;
  onHoverRef.current = onHover;
  activeRef.current = activeDesk;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // phone-class: a coarse pointer or few cores gets the lighter shadow setup
    const lite = !hover || (navigator.hardwareConcurrency || 8) <= 4;
    let engine;
    try {
      engine = createOffice({
        canvas, reducedMotion: reduced, lite,
        onStatus: (s, err) => { if (onStatusRef.current) onStatusRef.current(s, err); },
        onHover: (id) => { if (onHoverRef.current) onHoverRef.current(id); },
      });
    } catch (err) {
      // no WebGL, or a lost context on start
      console.error("Office engine failed to start:", err);
      if (onStatusRef.current) onStatusRef.current("failed", err);
      return undefined;
    }
    engineRef.current = engine;
    canvas.__office = engine; // for tests

    const parent = canvas.parentElement;
    const size = () => {
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(lite ? 1.5 : 2, window.devicePixelRatio || 1);
      engine.setViewport(r.width * dpr, r.height * dpr, dpr);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(parent);

    // the establishing move: the camera settles as the stage scrolls into place
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const r = parent.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        engine.setScroll((vh - r.top) / (vh * 0.55 + r.height * 0.5));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // no frames while off screen or in a background tab
    let visible = true, shown = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && shown) engine.resume(); else engine.pause(); }, { threshold: 0.02 });
    io.observe(parent);
    const onVis = () => { shown = !document.hidden; if (visible && shown) engine.resume(); else engine.pause(); };
    document.addEventListener("visibilitychange", onVis);

    // a lost GL context (the GPU was reclaimed, usually on a phone) leaves a frozen frame: say so instead
    const onLost = (e) => { e.preventDefault(); console.error("Office: WebGL context lost"); engine.pause(); if (onStatusRef.current) onStatusRef.current("failed"); };
    canvas.addEventListener("webglcontextlost", onLost);

    if (activeRef.current) engine.setFocus(activeRef.current);
    if (labelRefs) for (const id in labelRefs.current) engine.attachLabel(id, labelRefs.current[id]);
    engine.start();

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(scrollRaf);
      ro.disconnect(); io.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [labelRefs]);

  React.useEffect(() => {
    if (engineRef.current) engineRef.current.setFocus(activeDesk);
  }, [activeDesk]);

  const local = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, r];
  };
  const onClick = (e) => {
    const engine = engineRef.current;
    if (!engine) return;
    const [x, y] = local(e);
    const id = engine.hitTest(x, y);
    onSelectDesk(id && id !== activeDesk ? id : null);
  };
  const onPointerMove = (e) => {
    const engine = engineRef.current;
    if (!engine || e.pointerType !== "mouse") return;
    const [x, y, r] = local(e);
    engine.setPointer((x / r.width) * 2 - 1, -((y / r.height) * 2 - 1));
    engine.setHover(engine.hitTest(x, y));
  };
  const onPointerLeave = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setPointer(null);
    engine.setHover(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="block h-full w-full"
      style={{ touchAction: "manipulation" }}
      aria-hidden
    />
  );
}
