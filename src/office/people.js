// The four people: a rigged Quaternius character each, posed at a desk by
// bending bones on top of the Idle clip, with typing and head movement layered
// on, and a small state machine for getting up, walking an errand, greeting
// the visitor and sitting back down.
import * as THREE from "three";

const d2r = (d) => (d * Math.PI) / 180;
const WALK_SPEED = 1.0; // m/s
const RISE_TIME = 0.7;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerpAngle = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

// Seated pose as rotations about each bone's local axes, on top of the Idle clip.
// Axes were probed: thighs fold forward about -X, shins back about +X, arms forward about ∓Z.
const SEATED = [
  ["UpperLegL", "X", -85, "legs"], ["UpperLegR", "X", -85, "legs"], ["LowerLegL", "X", 80, "legs"], ["LowerLegR", "X", 80, "legs"],
  ["Torso", "X", 6, "legs"],
  ["UpperArmL", "Z", -58, "arms"], ["UpperArmR", "Z", 58, "arms"], ["LowerArmL", "Z", -50, "arms"], ["LowerArmR", "Z", 50, "arms"],
  ["Head", "X", 2, "head"],
];
const VARIANT = {
  read: [["Head", "X", 5, "head"]],
  type: [],
  chart: [["UpperArmR", "Z", -14, "arms"], ["LowerArmR", "Z", -16, "arms"]], // right hand out to the mouse
  phone: [["UpperArmR", "Z", 25, "arms"], ["LowerArmR", "Z", 75, "arms"], ["LowerArmR", "X", -30, "arms"], ["Head", "Z", -8, "head"]], // hand to the earpiece
};
// how much of the time each job has both hands typing
const TYPING_DUTY = { read: 0.45, type: 0.8, chart: 0.35, phone: 0 };
// every bone the pose layers touch on top of the clips
const TOUCHED = ["UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "Torso", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "Head"];

export class Person {
  constructor(id, gltf, desk, chair, opts = {}) {
    this.id = id;
    this.desk = desk;
    this.chair = chair;
    this.live = desk.live;
    this.variant = desk.variant;
    this.obj = gltf.scene;
    this.obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        // normals were stripped at build time; the low-poly look is flat shading
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m.flatShading = true; m.needsUpdate = true; });
      }
    });
    this.bones = {};
    this.obj.traverse((o) => { if (o.isBone) this.bones[o.name.replace(/[^\w-]/g, "")] = o; });
    for (const name of TOUCHED) if (!this.bones[name]) throw new Error(`${id}: rig has no bone ${name}`);
    // The mixer only writes a bone when its clip value changed since the last frame, so a bone we
    // rotate on top of the clip would otherwise keep our rotation and accumulate. Remember the clip's
    // value and our last output for every touched bone, and start each frame from the clip's value.
    this.clipQ = {}; this.outQ = {};
    for (const name of TOUCHED) { this.clipQ[name] = this.bones[name].quaternion.clone(); this.outQ[name] = new THREE.Quaternion(NaN, NaN, NaN, NaN); }
    this.mixer = new THREE.AnimationMixer(this.obj);
    this.actions = {};
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    for (const n of ["Idle", "Walk", "Wave", "Interact"]) if (!this.actions[n]) throw new Error(`${id}: model has no ${n} clip`);
    this.current = this.actions.Idle; this.current.play();
    this.overlay = SEATED.concat(VARIANT[this.variant] || []);
    this.w = { legs: 1, arms: 1, head: 1, look: 0 }; // overlay weights
    this.wTarget = { legs: 1, arms: 1, head: 1, look: 0 };
    this.state = "seated";
    this.t = 0;
    this.typing = { on: true, until: 3 };
    this.lean = { at: 18 + Math.random() * 10, amount: 0 };
    this.greeting = false;
    this.paused = null; // an errand interrupted by a greeting
    this.onSeated = null;
    this.headProp = null;

    // scale to height, then find how far the hips sit above the origin in the seated pose
    this.mixer.update(0);
    this.beginPose();
    const box = measure(this.obj);
    this.obj.scale.multiplyScalar((opts.height || 1.68) / (box.max.y - box.min.y));
    this.applyOverlay();
    this.endPose();
    this.obj.updateMatrixWorld(true);
    const hipY = this.bones.Hips.getWorldPosition(new THREE.Vector3()).y - this.obj.position.y;
    this.seatedY = (opts.seatHeight || 0.48) - hipY;
    this.standY = 0;
    this.current.timeScale = 0.55;

    // seat and stand points, in the room
    const f = new THREE.Vector3(Math.sin(desk.dir), 0, Math.cos(desk.dir));
    this.seat = new THREE.Vector3(desk.x - f.x * 0.62, 0, desk.z - f.z * 0.62);
    // where they step to when they get up: beside the chair, on the aisle side
    const r = new THREE.Vector3(f.z, 0, -f.x).multiplyScalar(desk.x < 0 ? 0.8 : -0.8);
    this.stand = new THREE.Vector3(this.seat.x + r.x, 0, this.seat.z + r.z);
    this.obj.position.set(this.seat.x, this.seatedY, this.seat.z);
    this.obj.rotation.y = desk.dir;
    this.heading = desk.dir;

    // an invisible column that follows the person, for taps while they are away from the desk
    this.hit = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 0.9; this.hit.userData.id = id;
    this.obj.add(this.hit);
    this.hit.scale.setScalar(1 / this.obj.scale.x);
  }

  // after the mixer: every touched bone starts from the clip's value, whether or not the mixer wrote it this frame
  beginPose() {
    for (const name of TOUCHED) {
      const q = this.bones[name].quaternion;
      if (q.equals(this.outQ[name])) q.copy(this.clipQ[name]); // the mixer skipped it: undo our last rotation
      else this.clipQ[name].copy(q); // the mixer wrote it: this is the clip's value
    }
  }
  endPose() { for (const name of TOUCHED) this.outQ[name].copy(this.bones[name].quaternion); }

  // rotate the posed bones by the seated overlay, scaled by the group weights
  applyOverlay(extra = 0) {
    for (const [name, ax, deg, group] of this.overlay) {
      const w = this.w[group]; if (w <= 0.001) continue;
      this.bones[name]["rotate" + ax](d2r(deg) * w);
    }
    if (extra) this.bones.Torso.rotateX(extra);
  }

  // Attach a prop to the head: Эхо's headset.
  addHeadset() {
    const head = this.bones.Head;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.4, metalness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 8, 24, Math.PI), mat);
    band.rotation.z = 0; band.position.y = 0.02; g.add(band);
    [-1, 1].forEach((s) => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), mat); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.105, 0.0, 0); g.add(cup); });
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6), mat); boom.position.set(-0.09, -0.05, 0.06); boom.rotation.set(d2r(-70), 0, d2r(-20)); g.add(boom);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6 })); mic.position.set(-0.075, -0.1, 0.11); g.add(mic);
    // the bone's world scale is the model scale; counter it so the prop is in metres
    const s = new THREE.Vector3(); head.getWorldScale(s);
    g.scale.setScalar(1 / s.x);
    g.position.set(0, 0.11 / s.x, 0.005 / s.x); // up from the neck joint to ear height
    head.add(g);
    this.headProp = g;
  }

  // ---------------------------------------------------------------- behaviour
  // Walk to a spot, do something there, come back and sit down. `path` is [x, z] points from the stand point.
  errand(path, facing, action, dwell) {
    if (this.state !== "seated" || this.greeting) return false;
    this.plan = { out: path, facing, action, dwell };
    this.state = "rising"; this.phase = 0;
    return true;
  }
  busy() { return this.state !== "seated" || this.greeting; }

  // The visitor opened this desk: face them and wave. `from` is the camera position.
  greet(from) {
    this.greeting = true;
    this.greetFrom = from.clone();
    this.wTarget.arms = 0; this.wTarget.look = 1;
    this.fadeTo(this.actions.Wave, 0.25, true);
  }
  ungreet() {
    if (!this.greeting) return;
    this.greeting = false;
    this.wTarget.arms = 1; this.wTarget.look = 0;
    if (this.current === this.actions.Wave) this.fadeTo(this.actions.Idle, 0.4);
  }

  fadeTo(action, dur, once = false) {
    if (this.current === action && !once) return;
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    action.timeScale = action === this.actions.Idle ? (this.state === "seated" ? 0.55 : 1) : 1;
    action.enabled = true;
    action.play();
    if (this.current !== action) this.current.crossFadeTo(action, dur, false);
    this.current = action;
  }

  update(dt, t, cameraPos) {
    this.t = t;
    // one-shot clips hand back to Idle
    if (this.current === this.actions.Wave && this.current.time >= this.current.getClip().duration - 0.05) {
      this.fadeTo(this.actions.Idle, 0.4);
      if (this.greeting) this.wTarget.arms = 1; // hands back to the work, eyes still on the visitor
    }
    this.mixer.update(dt);
    this.beginPose();

    // weights ease toward their targets
    const k = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(this.w)) this.w[key] += (this.wTarget[key] - this.w[key]) * k;

    switch (this.state) {
      case "seated": this.seatedTick(dt, t); break;
      case "rising": case "sitting": this.riseTick(dt); break;
      case "walking": this.walkTick(dt); break;
      case "standing": this.standTick(dt); break;
      default: break;
    }

    // body turn: toward the visitor while greeting, else the way the state wants
    let target = this.heading;
    if (this.greeting && this.greetFrom) {
      const dx = this.greetFrom.x - this.obj.position.x, dz = this.greetFrom.z - this.obj.position.z;
      target = Math.atan2(dx, dz);
    }
    this.obj.rotation.y = lerpAngle(this.obj.rotation.y, target, 1 - Math.exp(-dt * 5));
    if (this.chair && this.state === "seated") this.chair.rotation.y = this.obj.rotation.y;

    // pose layers, after the clip has written the bones
    let lean = 0;
    if (this.state === "seated") {
      if (t > this.lean.at) { const p = (t - this.lean.at) / 3; lean = -d2r(9) * Math.sin(Math.PI * Math.min(1, p)); if (p >= 1) this.lean.at = t + 22 + Math.random() * 12; }
    }
    this.applyOverlay(lean);
    this.microTick(t);
    if (this.w.look > 0.01 && cameraPos) this.lookAt(cameraPos, this.w.look);
    this.endPose();
  }

  seatedTick(dt, t) {
    this.obj.position.set(this.seat.x, this.seatedY, this.seat.z);
    this.heading = this.desk.dir;
    if (t > this.typing.until) {
      const duty = TYPING_DUTY[this.variant];
      this.typing.on = Math.random() < duty;
      this.typing.until = t + (this.typing.on ? 2 + Math.random() * 3 : 1 + Math.random() * 2.5);
    }
  }

  riseTick(dt) {
    this.phase = Math.min(1, this.phase + dt / RISE_TIME);
    const up = this.state === "rising" ? smooth(this.phase) : 1 - smooth(this.phase);
    this.w.legs = this.wTarget.legs = 1 - up; this.w.arms = this.wTarget.arms = 1 - up; this.w.head = this.wTarget.head = 1 - up;
    this.obj.position.lerpVectors(new THREE.Vector3(this.seat.x, this.seatedY, this.seat.z), new THREE.Vector3(this.stand.x, this.standY, this.stand.z), up);
    if (this.state === "rising") {
      this.heading = Math.atan2(this.stand.x - this.seat.x, this.stand.z - this.seat.z);
      if (this.phase > 0.6) this.fadeTo(this.actions.Walk, 0.3);
      if (this.phase >= 1) { this.state = "walking"; this.route = this.plan.out.slice(); this.routeEnd = "out"; }
    } else {
      this.heading = this.desk.dir;
      if (this.phase > 0.2) this.fadeTo(this.actions.Idle, 0.3);
      if (this.phase >= 1) { this.state = "seated"; this.current.timeScale = 0.55; if (this.onSeated) this.onSeated(this); }
    }
  }

  walkTick(dt) {
    if (this.greeting) { if (this.current === this.actions.Walk) this.fadeTo(this.actions.Idle, 0.3); return; }
    if (this.current !== this.actions.Walk && this.current !== this.actions.Wave) this.fadeTo(this.actions.Walk, 0.3);
    const p = this.obj.position;
    let step = WALK_SPEED * dt;
    while (step > 0 && this.route.length) {
      const [tx, tz] = this.route[0];
      const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.02) { this.route.shift(); continue; }
      this.heading = Math.atan2(dx, dz);
      const m = Math.min(step, dist);
      p.x += (dx / dist) * m; p.z += (dz / dist) * m; step -= m;
    }
    if (!this.route.length) {
      if (this.routeEnd === "out") {
        this.state = "standing"; this.heading = this.plan.facing; this.standUntil = this.t + this.plan.dwell;
        this.fadeTo(this.plan.action === "interact" ? this.actions.Interact : this.actions.Idle, 0.35);
      } else {
        this.state = "sitting"; this.phase = 0;
        this.obj.position.set(this.stand.x, this.standY, this.stand.z);
      }
    }
  }

  standTick() {
    if (this.greeting) return;
    if (this.t >= this.standUntil) {
      this.route = this.plan.out.slice().reverse().slice(1).concat([[this.stand.x, this.stand.z]]);
      this.routeEnd = "back"; this.state = "walking";
    }
  }

  // typing, reading, nodding on the call, glancing between screens
  microTick(t) {
    const w = this.w.legs; if (w < 0.02) return;
    const B = this.bones;
    if (this.typing.on && this.state === "seated") { B.LowerArmL.rotateX(Math.sin(t * 12) * d2r(3) * w); B.LowerArmR.rotateX(Math.sin(t * 12 + 2.1) * d2r(3) * w); }
    B.Torso.rotateX(Math.sin(t * 1.4) * d2r(0.7) * w); // breathing
    switch (this.variant) {
      case "read": B.Head.rotateX(Math.sin(t * 0.9) * d2r(2.5) * w); B.Head.rotateY(Math.sin(t * 0.35) * d2r(4) * w); break;
      case "chart": { const s = Math.tanh(4 * Math.sin(t * 0.55)); B.Head.rotateY(s * d2r(15) * w); break; }
      case "phone": { const nod = Math.max(0, Math.sin(t * 2.4)) * (Math.sin(t * 0.3) > 0 ? 1 : 0.2); B.Head.rotateX(nod * d2r(4) * w); B.Head.rotateY(Math.sin(t * 0.5) * d2r(6) * w); break; }
      default: B.Head.rotateY(Math.sin(t * 0.45) * d2r(4) * w); B.Head.rotateX(Math.sin(t * 0.8) * d2r(1.5) * w);
    }
  }

  // Turn the head toward a world point, within what a neck can do.
  lookAt(point, weight) {
    const head = this.bones.Head;
    const hp = head.getWorldPosition(new THREE.Vector3());
    // in the character's own space +z is forward; the head bone yaws about its local Y and nods about local X
    const d = this.obj.worldToLocal(point.clone()).sub(this.obj.worldToLocal(hp.clone()));
    const yaw = Math.atan2(d.x, d.z), pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    const cy = Math.max(-d2r(65), Math.min(d2r(65), yaw)), cp = Math.max(-d2r(25), Math.min(d2r(25), pitch));
    head.rotateY(cy * weight); head.rotateX(cp * weight * 0.5);
  }
}

// Bounding box of a posed character: skinned meshes need their own box from the bones.
export function measure(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((o) => {
    if (o.isSkinnedMesh) { o.computeBoundingBox(); box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); }
    else if (o.isMesh) box.expandByObject(o);
  });
  return box;
}
