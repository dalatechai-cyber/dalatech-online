import React from "react";
import * as THREE from "three";

const ULAANBAATAR = { lat: 47.9077, lng: 106.8832 };

const ACCENT_HEX = 0x38bdf8;
const ACCENT_HALO = 0x4ea7ff;
const GLOBE_RADIUS = 1.0;

const EARTH_MAP_URL =
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const EARTH_BUMP_URL =
  "https://unpkg.com/three-globe/example/img/earth-topology.png";

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function Globe({ className = "", reducedMotion = false }) {
  const mountRef = React.useRef(null);
  const labelRef = React.useRef(null);
  const hoverRef = React.useRef(false);

  React.useEffect(() => {
    const mount = mountRef.current;
    const labelEl = labelRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || width;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xfff3df, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.45);
    keyLight.position.set(2.4, 1.6, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6cb2ff, 0.55);
    rimLight.position.set(-3.2, 0.8, -2.4);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(0xa9c6ff, 0x0a0f1a, 0.25);
    scene.add(fillLight);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.18;
    globeGroup.rotation.y = 2.7;
    scene.add(globeGroup);

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 16,
      specular: 0x1a2230,
      bumpScale: 0.014,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earth);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(EARTH_MAP_URL, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });
    loader.load(EARTH_BUMP_URL, (tex) => {
      earthMat.bumpMap = tex;
      earthMat.needsUpdate = true;
    });

    const innerAtmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 64);
    const innerAtmoMat = new THREE.MeshBasicMaterial({
      color: ACCENT_HALO,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerAtmo = new THREE.Mesh(innerAtmoGeo, innerAtmoMat);
    globeGroup.add(innerAtmo);

    const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.18, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(ACCENT_HALO) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    const pinSurface = latLngToVector3(
      ULAANBAATAR.lat,
      ULAANBAATAR.lng,
      GLOBE_RADIUS
    );
    const pinNormal = pinSurface.clone().normalize();
    const ANTENNA_HEIGHT = 0.22;
    const pinTop = pinSurface
      .clone()
      .add(pinNormal.clone().multiplyScalar(ANTENNA_HEIGHT));

    const antennaGeo = new THREE.BufferGeometry().setFromPoints([
      pinSurface.clone(),
      pinTop.clone(),
    ]);
    const antennaMat = new THREE.LineBasicMaterial({
      color: ACCENT_HEX,
      transparent: true,
      opacity: 0.85,
    });
    const antenna = new THREE.Line(antennaGeo, antennaMat);
    globeGroup.add(antenna);

    const pinGeo = new THREE.SphereGeometry(0.045, 32, 32);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.copy(pinTop);
    globeGroup.add(pin);

    const pinHaloGeo = new THREE.SphereGeometry(0.09, 24, 24);
    const pinHaloMat = new THREE.MeshBasicMaterial({
      color: ACCENT_HEX,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pinHalo = new THREE.Mesh(pinHaloGeo, pinHaloMat);
    pinHalo.position.copy(pinTop);
    globeGroup.add(pinHalo);

    const ringGeo = new THREE.RingGeometry(0.045, 0.07, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ACCENT_HEX,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pinSurface);
    ring.lookAt(pinSurface.clone().multiplyScalar(2));
    globeGroup.add(ring);

    let speed = reducedMotion ? 0 : 0.0019;
    const baseSpeed = reducedMotion ? 0 : 0.0019;
    const slowSpeed = reducedMotion ? 0 : 0.0004;
    const start = performance.now();
    let raf = 0;

    const labelWorld = new THREE.Vector3();
    const pinWorldNormal = new THREE.Vector3();
    const projected = new THREE.Vector3();

    const tick = (now) => {
      const target = hoverRef.current ? slowSpeed : baseSpeed;
      speed += (target - speed) * 0.06;
      globeGroup.rotation.y += speed;

      const cycle = ((now - start) % 2200) / 2200;
      const eased = 1 - Math.pow(1 - cycle, 3);
      const ringScale = 1 + eased * 1.9;
      ring.scale.setScalar(ringScale);
      ringMat.opacity = 0.7 * (1 - cycle);
      pinHaloMat.opacity = 0.32 + 0.18 * Math.sin(cycle * Math.PI * 2);

      globeGroup.updateMatrixWorld(true);

      if (labelEl) {
        labelWorld.copy(pinTop).applyMatrix4(globeGroup.matrixWorld);
        projected.copy(labelWorld).project(camera);
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;

        pinWorldNormal.copy(pinNormal).applyQuaternion(globeGroup.quaternion);
        const facing = pinWorldNormal.z;
        const visible = facing > 0.05;
        const opacity = visible ? Math.min(1, (facing - 0.05) * 6) : 0;

        labelEl.style.transform = `translate(-50%, -100%) translate(${x.toFixed(
          1
        )}px, ${y.toFixed(1)}px)`;
        labelEl.style.opacity = opacity.toFixed(2);
      }

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

      earthGeo.dispose();
      if (earthMat.map) earthMat.map.dispose();
      if (earthMat.bumpMap) earthMat.bumpMap.dispose();
      earthMat.dispose();
      innerAtmoGeo.dispose();
      innerAtmoMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      pinHaloGeo.dispose();
      pinHaloMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      antennaGeo.dispose();
      antennaMat.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className={[
        "relative aspect-square w-full select-none",
        className,
      ].join(" ")}
      role="img"
      aria-label="Interactive globe with a pin marking Ulaanbaatar, Mongolia"
    >
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{
          transition: "opacity 220ms ease-out",
          willChange: "transform, opacity",
          opacity: 0,
        }}
      >
        <div className="flex flex-col items-center -translate-y-2">
          <div className="flex items-center gap-2 rounded-full border border-sky-400/30 bg-ink-950/80 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-sky-200 shadow-[0_10px_28px_-12px_rgba(56,189,248,0.55)] backdrop-blur-[6px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
            </span>
            Ulaanbaatar
          </div>
        </div>
      </div>
    </div>
  );
}
