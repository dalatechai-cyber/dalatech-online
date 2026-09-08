import React from "react";
import { createOffice } from "./office/engine";
import manifest from "./office/pack.json";

/**
 * Mounts the office engine on a canvas that fills its parent. Loads the atlas,
 * sizes the canvas to the parent (device pixels, so the art stays crisp),
 * forwards taps on desks, and reports the camera to the page so labels can be
 * placed in world coordinates.
 *
 * Lazy-loaded: the engine, the manifest and the atlas only arrive on /office.
 */
export default function OfficeScene({ activeDesk, onSelectDesk, onView, onStatus }) {
  const canvasRef = React.useRef(null);
  const engineRef = React.useRef(null);
  const onViewRef = React.useRef(onView);
  const onStatusRef = React.useRef(onStatus);
  onViewRef.current = onView;
  onStatusRef.current = onStatus;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let cancelled = false;
    let engine = null;
    let ro = null;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const img = new Image();
    img.decoding = "async";
    let lastView = null;
    const onLoad = () => {
      if (cancelled) return;
      try {
        engine = createOffice({
          canvas,
          manifest,
          atlas: img,
          reducedMotion: reduced,
          onView: (v) => {
            // only wake React when the camera actually moved
            if (lastView && lastView.ox === v.ox && lastView.oy === v.oy && lastView.scale === v.scale && lastView.cw === v.cw) return;
            lastView = v;
            if (onViewRef.current) onViewRef.current(v);
          },
        });
      } catch (err) {
        console.error("Office engine failed to start:", err);
        if (onStatusRef.current) onStatusRef.current("failed");
        return;
      }
      engineRef.current = engine;
      canvas.__office = engine; // for tests
      const parent = canvas.parentElement;
      const size = () => {
        const r = parent.getBoundingClientRect();
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        engine.setViewport(r.width * dpr, r.height * dpr, dpr);
      };
      size();
      ro = new ResizeObserver(size);
      ro.observe(parent);
      engine.start();
      if (onStatusRef.current) onStatusRef.current("ready");
    };
    const onError = () => {
      if (cancelled) return;
      console.error("Office atlas failed to load:", img.src);
      if (onStatusRef.current) onStatusRef.current("failed");
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = manifest.atlas;

    return () => {
      cancelled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      if (ro) ro.disconnect();
      if (engine) engine.destroy();
      engineRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (engineRef.current) engineRef.current.setFocus(activeDesk);
  }, [activeDesk]);

  const onClick = (e) => {
    const engine = engineRef.current;
    if (!engine) return;
    const r = canvasRef.current.getBoundingClientRect();
    const dpr = canvasRef.current.width / r.width;
    const id = engine.hitTest((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    onSelectDesk(id && id !== activeDesk ? id : null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={onClick}
      className="block h-full w-full [image-rendering:pixelated]"
      style={{ touchAction: "manipulation" }}
      aria-hidden
    />
  );
}
