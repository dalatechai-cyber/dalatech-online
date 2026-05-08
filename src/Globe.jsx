import React from "react";
import GlobeGL from "react-globe.gl";
import * as THREE from "three";

const ULAANBAATAR = { lat: 47.9077, lng: 106.8832, label: "Ulaanbaatar" };

const ARC_TARGETS = [
  { name: "Seoul", lat: 37.5665, lng: 126.978 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
];

const ACCENT = "#38BDF8";
const ACCENT_RGB = "56, 189, 248";
const OCEAN_HEX = "#03081a";
const LAND_DOT = "#3b82f6";
const OCEAN_DOT = "#0c1a3a";

const LAND_MASK = [
  "........................................................................",
  "........................................................................",
  ".........................###############...............................",
  ".................#####################################.................",
  ".................############################################..........",
  "...........#######################################################......",
  "..........###################################..######################...",
  ".........###################################......##########..########..",
  ".........#################################........###########..#######..",
  "...........#############################...........###############......",
  "..............########################..............#############.......",
  ".............#######################.................##########........#",
  ".............######################...................#########........#",
  "............#####################......................########........",
  "............####################........................######.........",
  "...........###################...........................####..........",
  "...........#################..............................####.........",
  "...........###############.................................###.........",
  "...........#############....................................##.........",
  "............#########.........................................#........",
  ".............########..........................................#.......",
  ".............######.............................................#......",
  "..............#####.............................................##.....",
  "...............####..............................................###...",
  "................###...............................................##...",
  "................##.................................................#...",
  ".................#......................................................",
  ".................#......................................................",
  "..................#.....................................................",
  "...................#....................................................",
  ".....................###################................................",
  "....................########################...........................",
  "..................############################.........................",
  "................################################.......................",
  "...........#######################################.....................",
  "........................................................................",
];

function isLand(lat, lng) {
  const rows = LAND_MASK.length;
  const cols = LAND_MASK[0].length;
  const rowF = ((90 - lat) / 180) * rows;
  const colF = ((lng + 180) / 360) * cols;
  const row = Math.max(0, Math.min(rows - 1, Math.floor(rowF)));
  const col = Math.max(0, Math.min(cols - 1, Math.floor(colF)));
  return LAND_MASK[row][col] === "#";
}

function buildSurfacePoints() {
  const N = 4400;
  const phi = Math.PI * (3 - Math.sqrt(5));
  const points = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    points.push({ lat, lng, land: isLand(lat, lng) });
  }
  return points;
}

export default function Globe({ className = "", reducedMotion = false }) {
  const globeRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const hoverRef = React.useRef(false);
  const speedRef = React.useRef(reducedMotion ? 0 : 0.45);
  const pinObjRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 480, height: 480 });

  const surfacePoints = React.useMemo(() => buildSurfacePoints(), []);

  const pinData = React.useMemo(() => [ULAANBAATAR], []);

  const arcs = React.useMemo(
    () =>
      ARC_TARGETS.map((t) => ({
        startLat: ULAANBAATAR.lat,
        startLng: ULAANBAATAR.lng,
        endLat: t.lat,
        endLng: t.lng,
      })),
    []
  );

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const setFromEl = () => {
      const w = el.clientWidth;
      if (w > 0) setSize({ width: w, height: w });
    };
    setFromEl();
    const ro = new ResizeObserver(setFromEl);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const g = globeRef.current;
    if (!g) return;

    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = reducedMotion ? 0 : 0.45;

    g.pointOfView({ lat: 28, lng: 96, altitude: 2.55 }, 0);

    const mat = g.globeMaterial();
    mat.color = new THREE.Color(OCEAN_HEX);
    mat.emissive = new THREE.Color("#020512");
    mat.emissiveIntensity = 1;
    mat.shininess = 0;
    mat.transparent = false;

    let raf = 0;
    const baseSpeed = reducedMotion ? 0 : 0.45;
    const slowSpeed = reducedMotion ? 0 : 0.07;
    const tick = (now) => {
      const target = hoverRef.current ? slowSpeed : baseSpeed;
      speedRef.current += (target - speedRef.current) * 0.06;
      controls.autoRotateSpeed = speedRef.current;

      const pin = pinObjRef.current;
      if (pin && !reducedMotion) {
        const t0 = pin.userData.t0 || now;
        const cycle = ((now - t0) % 1800) / 1800;
        const eased = 1 - Math.pow(1 - cycle, 3);
        const ringScale = 1 + eased * 1.9;
        const ring = pin.userData.ring;
        const halo = pin.userData.halo;
        if (ring) {
          ring.scale.set(ringScale, ringScale, 1);
          ring.material.opacity = 0.7 * (1 - cycle);
        }
        if (halo) {
          halo.material.opacity = 0.22 + 0.18 * Math.sin(cycle * Math.PI * 2);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const onPointerEnter = () => {
    hoverRef.current = true;
  };
  const onPointerLeave = () => {
    hoverRef.current = false;
  };

  const buildPin = React.useCallback(() => {
    const accent = new THREE.Color(ACCENT);
    const group = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 24),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 1 })
    );
    group.add(core);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 24, 24),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(halo);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.85, 48),
      new THREE.MeshBasicMaterial({
        color: accent,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    group.add(ring);

    group.userData = { ring, core, halo, t0: performance.now() };
    pinObjRef.current = group;
    return group;
  }, []);

  const updatePin = React.useCallback((obj) => {
    const g = globeRef.current;
    if (!g || !obj) return;
    const radius = g.getGlobeRadius ? g.getGlobeRadius() : 100;
    const baseScale = radius * 0.018;
    obj.scale.set(baseScale, baseScale, baseScale);
    obj.lookAt(0, 0, 0);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={["relative aspect-square w-full select-none", className].join(" ")}
      role="img"
      aria-label="Interactive globe with a pin marking Ulaanbaatar, Mongolia"
    >
      <GlobeGL
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        rendererConfig={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        animateIn={false}
        showAtmosphere
        atmosphereColor={ACCENT}
        atmosphereAltitude={0.22}
        showGraticules={false}
        pointsData={surfacePoints}
        pointAltitude={0.003}
        pointRadius={0.18}
        pointResolution={4}
        pointColor={(p) => (p.land ? LAND_DOT : OCEAN_DOT)}
        pointsMerge
        customLayerData={pinData}
        customThreeObject={buildPin}
        customThreeObjectUpdate={updatePin}
        customLayerLat="lat"
        customLayerLng="lng"
        customLayerAltitude={0.012}
        arcsData={arcs}
        arcStroke={0.35}
        arcAltitudeAutoScale={0.45}
        arcDashLength={0.45}
        arcDashGap={2.2}
        arcDashInitialGap={() => Math.random() * 2}
        arcDashAnimateTime={3600}
        arcColor={() => [
          `rgba(${ACCENT_RGB}, 0)`,
          `rgba(${ACCENT_RGB}, 0.85)`,
          `rgba(${ACCENT_RGB}, 0)`,
        ]}
      />
    </div>
  );
}
