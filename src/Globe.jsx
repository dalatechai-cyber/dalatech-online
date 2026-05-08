import React from "react";
import * as THREE from "three";

const ULAANBAATAR = { lat: 47.9077, lng: 106.8832 };

const ACCENT_HEX = 0x38bdf8;
const GLOBE_RADIUS = 1.4;
const EARTH_TEXTURE_URL =
  "https://unpkg.com/three-globe/example/img/earth-night.jpg";

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(-5, 2, 3);
    scene.add(dirLight);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.32;
    globeGroup.rotation.y = -1.85;
    scene.add(globeGroup);

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 6,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earth);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(EARTH_TEXTURE_URL, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });

    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.025, 64, 64);
    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmo);

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

      earthGeo.dispose();
      if (earthMat.map) earthMat.map.dispose();
      earthMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
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
