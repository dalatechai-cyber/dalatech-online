// The /office engine: a small three.js room with the four AI staff at work.
// Owns loading, the scene, the camera rig, taps and the
// frame loop. The page owns the labels and the glass card; it drives this
// through the returned handle.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ROOM, CHAIR_SCALE, createFurniture, buildRoom, buildLights, createScreenFeed, laptop, panelFace } from "./room";
import { Person } from "./people";
import { DESKS } from "./layout";

const MODELS = "/office/models/";

function loadGltf(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, (e) => reject(new Error(`failed to load ${url}: ${e && e.message ? e.message : e}`))));
}

/**
 * createOffice({ canvas, reducedMotion, lite, onStatus, onHover })
 *  - reducedMotion: no dolly, no parallax; the room still lives on its screens and in the hands
 *  - lite: phone-class GPU — fewer shadows, capped pixel ratio
 * Returns { start, destroy, setViewport, setFocus, hitTest, setPointer, attachLabel }.
 */
export function createOffice({ canvas, reducedMotion = false, lite = false, onStatus, onHover }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lite ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a18);
  scene.fog = new THREE.Fog(0x0a1228, 10, 18);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  const raycaster = new THREE.Raycaster();

  let width = 1, height = 1, dpr = 1;
  let people = [], stations = {}, feeds = [], room = null, hitMeshes = [];
  let focus = null, hoverId = null;
  let running = false, destroyed = false, ready = false, raf = 0;
  let t = 0;
  const pointer = { x: 0, y: 0, active: false };
  const labels = {};
  const clock = { last: performance.now() };

  // ---------------------------------------------------------------- camera rig
  // The camera eases toward `camGoal`; the establishing move and pointer parallax are offsets on top.
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  let scrollProgress = 1, fovGoal = 36;

  function overviewGoal() {
    const aspect = width / height;
    if (aspect < 1.05) {
      // portrait: closer and framed on the front row; the unbuilt desks show at the edges
      fovGoal = Math.min(70, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27)) / aspect)));
      goalPos.set(0.2, 1.5, 8.7); goalLook.set(0, 0.55, 3.2);
    } else {
      fovGoal = 38;
      goalPos.set(0.45, 1.8, 9.4); goalLook.set(0, 0.9, 2.6);
    }
    if (!reducedMotion) { const p = 1 - scrollProgress; goalPos.y += 0.7 * p; goalPos.z += 1.2 * p; goalLook.y += 0.2 * p; }
  }
  function focusGoal(id) {
    const st = stations[id];
    const d = st.desk;
    const aspect = width / height, portrait = aspect < 1.05;
    fovGoal = portrait ? 50 : 34;
    const where = st.person.seat;
    const f = new THREE.Vector3(Math.sin(d.dir), 0, Math.cos(d.dir));
    const back = d.z < 3; // the back row sits behind the front desks: come in higher, closer, and from the wall side
    goalLook.set(where.x, 1.0, where.z);
    goalPos.set(where.x, 0, where.z).addScaledVector(f, back ? 1.9 : 2.5);
    goalPos.y = back ? 1.9 : 1.45;
    if (back) goalPos.x += (d.x < 0 ? -1 : 1) * 0.6;
    else if (!portrait) goalPos.x += (d.x < 0 ? 1 : -1) * 0.35; // a step toward the aisle, for the three-quarter view
    // leave room for the card: the person sits left of centre on wide screens, high on phones
    const dist = goalPos.distanceTo(goalLook);
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(fovGoal / 2));
    if (portrait) goalLook.y -= halfH * 0.5;
    else {
      const fwd = goalLook.clone().sub(goalPos).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      goalLook.addScaledVector(right, halfH * aspect * 0.34);
    }
  }
  let debugCam = null; // tests only: a fixed camera instead of the rig
  function updateCamera(dt) {
    if (focus && stations[focus]) focusGoal(focus); else overviewGoal();
    if (debugCam) { goalPos.copy(debugCam.pos); goalLook.copy(debugCam.look); fovGoal = debugCam.fov || 40; }
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    camPos.lerp(goalPos, k); camLook.lerp(goalLook, k);
    camera.fov += (fovGoal - camera.fov) * k;
    camera.position.copy(camPos);
    if (pointer.active && !reducedMotion) {
      // pointer parallax: the room shifts a few centimetres against the pointer
      camera.position.x += pointer.x * 0.16; camera.position.y += pointer.y * 0.08;
    }
    camera.lookAt(camLook);
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- the world
  async function build() {
    // the signs and screens are drawn with the site's fonts; give them a moment to arrive
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const [furn, ...chars] = await Promise.all([loadGltf(MODELS + "furniture.glb"), ...DESKS.map((d) => loadGltf(MODELS + d.id + ".glb")), Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))])]);
    if (destroyed) return;
    const place = createFurniture(furn);
    room = buildRoom(scene, place, lite);
    const lampPositions = [];
    DESKS.forEach((desk, i) => {
      const st = workstation(desk, chars[i], place);
      stations[desk.id] = st;
      people.push(st.person);
      if (desk.live) lampPositions.push(st.lamp);
    });
    buildLights(scene, lampPositions, lite);
  }

  // A workstation. Everything hangs off the desk: the chair tucks in behind it, the laptop sits in
  // front of the seat, the monitor stands on the outer end of the desktop turned to face the seat,
  // the lamp and plant stand on the desktop, the person sits on the chair's cushion. `a` is along
  // the person's facing, `b` along their right, both from the desk's centre.
  function workstation(desk, gltf, place) {
    const { x, z, dir, kind, live } = desk;
    const f = new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir));
    const r = new THREE.Vector3(f.z, 0, -f.x); // the person's right
    const outer = x < 0 ? -1 : 1; // r points toward the aisle on both sides, so the wall side is -r on the left, +r on the right
    const at = (a, b) => [x + f.x * a + r.x * b, z + f.z * a + r.z * b];
    const deskObj = place(scene, "desk", ...at(0, 0), dir);
    const deskH = deskObj.userData.size.y, deskD = deskObj.userData.size.z, deskW = deskObj.userData.size.x;

    // chair: its front edge just under the desk's back edge
    const chairProbe = place(scene, "chairDesk", 0, -50, 0, { scale: CHAIR_SCALE });
    const chairD = chairProbe.userData.size.z; scene.remove(chairProbe);
    const seatBack = deskD / 2 + chairD / 2 - 0.1;
    const [sx, sz] = at(-seatBack, 0);
    const chair = place(scene, "chairDesk", sx, sz, dir, { scale: CHAIR_SCALE });
    const seatHeight = chair.userData.size.y * 0.435; // where the cushion is on this chair
    const seat = new THREE.Vector3(sx, seatHeight, sz);

    const feed = createScreenFeed(kind, live);
    const lapFeed = createScreenFeed(kind === "chart" ? "outreach" : "chat", live);
    feeds.push(feed, lapFeed);
    // laptop: on the desktop, in front of the seat, facing the person
    const lap = laptop(lapFeed, live, lite);
    const [lpx, lpz] = at(-deskD / 2 + 0.2, 0.02);
    lap.position.set(lpx, deskH, lpz); lap.rotation.y = dir; scene.add(lap);
    const laptopScreen = new THREE.Vector3(lpx, deskH + 0.14, lpz);

    // monitor: on the outer end of the desktop, fully on it, turned to face the seat
    const [mx, mz] = at(0.06, outer * (deskW / 2 - 0.33));
    const m = place(scene, "computerScreen", mx, mz, 0, { y: deskH });
    m.rotation.y = Math.atan2(sx - mx, sz - mz);
    const sz2 = m.userData.size;
    const inner = m.children[0];
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(sz2.x * 0.86, sz2.y * 0.62), new THREE.MeshStandardMaterial({ map: feed.texture, emissive: 0xffffff, emissiveMap: feed.texture, emissiveIntensity: live ? 0.95 : 0.3, roughness: 0.4 }));
    pane.position.set(0, deskH + sz2.y * 0.58, panelFace(inner, deskH + sz2.y * 0.3) + 0.004);
    inner.add(pane);
    if (live) { const gl = new THREE.PointLight(0x38bdf8, 1.0, 1.8, 2); gl.position.set(0, deskH + sz2.y * 0.6, 0.3); inner.add(gl); }
    const monitorScreen = new THREE.Vector3(mx, deskH + sz2.y * 0.6, mz);

    place(scene, "computerMouse", ...at(-deskD / 2 + 0.22, 0.3), dir, { y: deskH });
    // lamp and plant on the aisle end of the desktop, the radio by the monitor for the call desk
    const lampB = -outer * (deskW / 2 - 0.16);
    const [lx, lz] = at(0.12, lampB);
    const lamp = place(scene, "lampSquareTable", lx, lz, dir, { y: deskH });
    lamp.traverse((o) => {
      if (!o.isMesh || !(o.material.name || "").startsWith("lamp")) return;
      o.material = o.material.clone();
      if (live) { o.material.emissive.setHex(0xffc878); o.material.emissiveIntensity = 1.4; } else o.material.color.setHex(0x3a3f55);
    });
    place(scene, ["plantSmall1", "plantSmall2", "plantSmall3"][Math.abs(Math.round(x)) % 3], ...at(0.2, lampB * 0.6), dir, { y: deskH });
    if (kind === "call") place(scene, "radio", ...at(0.16, outer * 0.12), dir + 0.4, { y: deskH, scale: 0.6 });
    let deskPhone = null;
    if (kind === "outreach") {
      deskPhone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.145), new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: 0.35, metalness: 0.5 }));
      const [px, pz] = at(-deskD / 2 + 0.24, -0.3);
      deskPhone.position.set(px, deskH + 0.004, pz); deskPhone.rotation.y = dir + 0.3; scene.add(deskPhone);
    }
    if (!live) {
      // an unbuilt desk sits behind a low frosted screen along its front edge, its lamp off
      const p = new THREE.Mesh(new THREE.BoxGeometry(deskW, 0.34, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xc4d2f0, transparent: true, opacity: 0.32, roughness: 0.6 }));
      p.position.set(x, deskH + 0.17, z); p.rotation.y = dir; p.translateZ(deskD / 2 + 0.02); scene.add(p);
    }
    const person = new Person(desk.id, gltf, desk, chair, { seatHeight, seatBack, targets: { laptop: laptopScreen, monitor: monitorScreen } });
    if (kind === "call") person.addHeadset();
    if (deskPhone) person.addPhone(deskPhone);
    scene.add(person.obj);
    // the tap target: the desk, the chair and the seat, as one invisible box
    const hit = new THREE.Mesh(new THREE.BoxGeometry(deskW + 0.3, 1.7, deskD + chairD + 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x - f.x * (chairD / 2), 0.85, z - f.z * (chairD / 2)); hit.rotation.y = dir; hit.userData.id = desk.id;
    scene.add(hit); hitMeshes.push(hit);
    return { desk, person, chair, seat, lamp: [lx, deskH + lamp.userData.size.y * 0.9, lz], labelAnchor: new THREE.Vector3(sx, seatHeight + 1.05, sz) };
  }

  // ---------------------------------------------------------------- labels and taps
  const v = new THREE.Vector3();
  function placeLabels() {
    for (const id in labels) {
      const el = labels[id]; const st = stations[id]; if (!el || !st) continue;
      v.copy(st.labelAnchor).project(camera);
      const behind = v.z > 1;
      const cssW = width / dpr;
      // keep the whole pill inside the stage
      const half = el.offsetWidth / 2 + 6;
      const px = Math.min(cssW - half, Math.max(half, (v.x * 0.5 + 0.5) * cssW)), py = (-v.y * 0.5 + 0.5) * (height / dpr);
      el.style.transform = `translate(-50%, -100%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      el.style.visibility = behind ? "hidden" : "visible";
      el.style.zIndex = String(Math.round(1000 - v.z * 500)); // nearer desks over farther ones
    }
  }
  function hitTest(cssX, cssY) {
    if (!ready) return null;
    const nx = (cssX / (width / dpr)) * 2 - 1, ny = -(cssY / (height / dpr)) * 2 + 1;
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    return hits.length ? hits[0].object.userData.id : null;
  }

  // ---------------------------------------------------------------- the loop
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    // rAF timestamps can precede the resume time by a frame: never step backwards
    const dt = Math.min(0.05, Math.max(0, (now - clock.last) / 1000)); clock.last = now;
    t += dt;
    for (const p of people) p.update(dt, t, camera.position);
    for (const f of feeds) f.tick(t);
    room.update(Date.now());
    updateCamera(dt);
    placeLabels();
    renderer.render(scene, camera);
  }

  const handle = {
    async start() {
      try {
        await build();
      } catch (err) {
        console.error("Office failed to build:", err);
        if (onStatus) onStatus("failed", err);
        return;
      }
      if (destroyed) return;
      ready = true;
      overviewGoal(); camera.fov = fovGoal; camPos.copy(goalPos); camLook.copy(goalLook);
      if (focus) handle.setFocus(focus);
      if (onStatus) onStatus("ready");
      handle.resume();
    },
    resume() { if (running || !ready || destroyed) return; running = true; clock.last = performance.now(); raf = requestAnimationFrame(frame); },
    pause() { running = false; cancelAnimationFrame(raf); },
    setViewport(w, h, ratio) {
      width = Math.max(1, Math.round(w)); height = Math.max(1, Math.round(h)); dpr = ratio;
      renderer.setPixelRatio(1); renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    },
    // 0 = the stage has just entered the viewport from below, 1 = it is in place
    setScroll(p) { scrollProgress = Math.min(1, Math.max(0, p)); },
    setPointer(nx, ny) { if (nx == null) pointer.active = false; else { pointer.active = true; pointer.x = nx; pointer.y = ny; } },
    setFocus(id) {
      const prev = focus;
      focus = id && DESKS.some((d) => d.id === id) ? id : null;
      if (!ready) return;
      if (prev && stations[prev]) stations[prev].person.ungreet();
      if (focus) { focusGoal(focus); stations[focus].person.greet(goalPos); }
    },
    hitTest,
    setHover(id) { if (id === hoverId) return; hoverId = id; if (onHover) onHover(id); },
    attachLabel(id, el) { if (el) labels[id] = el; else delete labels[id]; },
    // for tests: park the camera somewhere, or release it with null
    setDebugCamera(pos, look, fov) { debugCam = pos ? { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov } : null; },
    // for tests: where everyone is
    debug() { return { t, running, ready, people: people.map((p) => ({ id: p.id, activity: p.act.pose + "/" + p.act.look, pos: p.obj.position.toArray().map((n) => +n.toFixed(2)) })) }; },
    destroy() {
      destroyed = true; handle.pause();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
      renderer.dispose();
    },
  };
  return handle;
}

export { ROOM };
