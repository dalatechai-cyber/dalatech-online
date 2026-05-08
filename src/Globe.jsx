import React from "react";
import * as THREE from "three";

const ULAANBAATAR = { lat: 47.9077, lng: 106.8832 };

const ACCENT_COLOR = 0x38bdf8;
const OCEAN_COLOR = 0x081325;
const OCEAN_EMISSIVE = 0x040a18;
const LAND_COLOR = 0x2563eb;
const ATMO_COLOR = new THREE.Color(0x38bdf8);

const GLOBE_RADIUS = 1.4;

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Hand-coded coarse landmass mask, 72 longitudes x 36 latitudes.
// Each row = one latitude band (north to south, 5 deg each).
// '#' = land, '.' = ocean. Compressed but recognizable as continents.
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

function buildLandDots() {
  const N = 4200;
  const phi = Math.PI * (3 - Math.sqrt(5));
  const positions = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);

    if (isLand(lat, lng)) {
      const radius = GLOBE_RADIUS * 1.005;
      positions.push(x * radius, y * radius, z * radius);
    }
  }
  return new Float32Array(positions);
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
        float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
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

    let width = mount.clientWidth;
    let height = mount.clientHeight;

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
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.4;
    globeGroup.rotation.y = -1.85;

    const oceanGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const oceanMat = new THREE.MeshPhongMaterial({
      color: OCEAN_COLOR,
      emissive: OCEAN_EMISSIVE,
      shininess: 6,
      specular: 0x0c1a30,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    globeGroup.add(ocean);

    const wireGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 36, 18);
    const wireMat = new THREE.MeshBasicMaterial({
      color: ACCENT_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wire);

    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute("position", new THREE.BufferAttribute(buildLandDots(), 3));
    const dotsMat = new THREE.PointsMaterial({
      color: LAND_COLOR,
      size: 0.022,
      transparent: true,
      opacity: 0.78,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const dots = new THREE.Points(dotsGeo, dotsMat);
    globeGroup.add(dots);

    const pinPos = latLngToVector3(ULAANBAATAR.lat, ULAANBAATAR.lng, GLOBE_RADIUS * 1.012);
    const pinGeo = new THREE.SphereGeometry(0.038, 24, 24);
    const pinMat = new THREE.MeshBasicMaterial({ color: ACCENT_COLOR });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.copy(pinPos);
    globeGroup.add(pin);

    const ringGeo = new THREE.RingGeometry(0.05, 0.07, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ACCENT_COLOR,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pinPos);
    ring.lookAt(pinPos.clone().multiplyScalar(2));
    globeGroup.add(ring);

    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.18, 64, 64);
    const atmo = new THREE.Mesh(atmoGeo, makeAtmosphereMaterial());
    scene.add(atmo);

    scene.add(globeGroup);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(ACCENT_COLOR, 0.35);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    let speed = reducedMotion ? 0 : 0.0021;
    const baseSpeed = reducedMotion ? 0 : 0.0021;
    const slowSpeed = reducedMotion ? 0 : 0.00045;
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const target = hoverRef.current ? slowSpeed : baseSpeed;
      speed += (target - speed) * 0.06;
      globeGroup.rotation.y += speed;

      const t = ((now - start) % 2000) / 2000;
      const eased = 1 - Math.pow(1 - t, 3);
      ring.scale.setScalar(1 + eased * 1.9);
      ring.material.opacity = 0.55 * (1 - t);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      if (!mount) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const onEnter = () => { hoverRef.current = true; };
    const onLeave = () => { hoverRef.current = false; };
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

      oceanGeo.dispose();
      oceanMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      dotsGeo.dispose();
      dotsMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      atmoGeo.dispose();
      atmo.material.dispose();
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
