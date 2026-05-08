import React from "react";
import * as THREE from "three";

const ULAANBAATAR = { lat: 47.9077, lng: 106.8832 };

const ACCENT_HEX = 0x38bdf8;
const LAND_HEX = 0x3b82f6;
const OCEAN_HEX = 0x0c1a3a;
const ATMO_COLOR = new THREE.Color(0x38bdf8);

const GLOBE_RADIUS = 1.4;

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

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function buildDotGeometry() {
  const N = 5800;
  const phi = Math.PI * (3 - Math.sqrt(5));
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const land = new THREE.Color(LAND_HEX);
  const ocean = new THREE.Color(OCEAN_HEX);
  const surfaceR = GLOBE_RADIUS * 1.005;

  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;

    positions[i * 3] = x * surfaceR;
    positions[i * 3 + 1] = y * surfaceR;
    positions[i * 3 + 2] = z * surfaceR;

    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    const c = isLand(lat, lng) ? land : ocean;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function makeAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: ATMO_COLOR } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float rim = max(0.0, 0.48 - dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float intensity = pow(rim, 5.5) * 0.55;
        gl_FragColor = vec4(uColor, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

export default function Globe({ className = "", reducedMotion = false }) {
  const mountRef = React.useRef(null);
  const hoverRef = React.useRef(false);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || width;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.32;
    globeGroup.rotation.y = -1.85;
    scene.add(globeGroup);

    const dotsGeo = buildDotGeometry();
    const dotsMat = new THREE.PointsMaterial({
      size: 0.024,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const dots = new THREE.Points(dotsGeo, dotsMat);
    globeGroup.add(dots);

    const pinPos = latLngToVector3(
      ULAANBAATAR.lat,
      ULAANBAATAR.lng,
      GLOBE_RADIUS * 1.012
    );
    const pinGeo = new THREE.SphereGeometry(0.04, 24, 24);
    const pinMat = new THREE.MeshBasicMaterial({ color: ACCENT_HEX });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.copy(pinPos);
    globeGroup.add(pin);

    const haloGeo = new THREE.SphereGeometry(0.075, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: ACCENT_HEX,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(pinPos);
    globeGroup.add(halo);

    const ringGeo = new THREE.RingGeometry(0.05, 0.075, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ACCENT_HEX,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pinPos);
    ring.lookAt(pinPos.clone().multiplyScalar(2));
    globeGroup.add(ring);

    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 64, 64);
    const atmoMat = makeAtmosphereMaterial();
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmo);

    let speed = reducedMotion ? 0 : 0.0021;
    const baseSpeed = reducedMotion ? 0 : 0.0021;
    const slowSpeed = reducedMotion ? 0 : 0.00045;
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const target = hoverRef.current ? slowSpeed : baseSpeed;
      speed += (target - speed) * 0.06;
      globeGroup.rotation.y += speed;

      const cycle = ((now - start) % 1800) / 1800;
      const eased = 1 - Math.pow(1 - cycle, 3);
      const ringScale = 1 + eased * 1.9;
      ring.scale.setScalar(ringScale);
      ringMat.opacity = 0.7 * (1 - cycle);
      haloMat.opacity = 0.22 + 0.18 * Math.sin(cycle * Math.PI * 2);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || w;
      width = w;
      height = h;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };
    mount.addEventListener("pointerenter", onEnter);
    mount.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointerenter", onEnter);
      mount.removeEventListener("pointerleave", onLeave);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }

      dotsGeo.dispose();
      dotsMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className={["relative aspect-square w-full select-none", className].join(" ")}
      role="img"
      aria-label="Interactive globe with a pin marking Ulaanbaatar, Mongolia"
    />
  );
}
