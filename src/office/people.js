// The four people: a rigged Quaternius character each, seated at a desk by
// bending bones on top of the Idle clip, with a small repertoire of desk
// activities layered on (typing, reading the side monitor, working the mouse,
// taking a call, checking a phone), a look-at for the head, and a greeting
// for the visitor. Nobody leaves their desk.
import * as THREE from "three";

const d2r = (d) => (d * Math.PI) / 180;
const lerpAngle = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
const between = (a, b) => a + Math.random() * (b - a);

// every bone the pose layers touch on top of the clips
const TOUCHED = ["UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "Torso", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "Head"];

// Rotations about each bone's local axes, on top of the Idle clip. Axes were probed:
// thighs fold forward about -X, shins back about +X, arms come forward about ∓Z.
// The group says which weight scales the rotation (legs stay, arms drop for the wave).
const SEATED = [
  ["UpperLegL", "X", -85, "legs"], ["UpperLegR", "X", -85, "legs"], ["LowerLegL", "X", 80, "legs"], ["LowerLegR", "X", 80, "legs"],
  ["Torso", "X", 6, "legs"],
  ["UpperArmL", "Z", -58, "arms"], ["UpperArmR", "Z", 58, "arms"], ["LowerArmL", "Z", -50, "arms"], ["LowerArmR", "Z", 50, "arms"],
  ["Head", "X", 2, "head"],
];
// activity poses, added to SEATED
const POSE = {
  hands: [],
  mouse: [["UpperArmR", "Z", -14, "arms"], ["LowerArmR", "Z", -16, "arms"]], // right hand out to the mouse
  rest: [["LowerArmL", "Z", 10, "arms"], ["LowerArmR", "Z", -10, "arms"], ["Torso", "X", -5, "legs"]], // hands back off the keys, sitting up
  ear: [["UpperArmR", "Z", 25, "arms"], ["LowerArmR", "Z", 75, "arms"], ["LowerArmR", "X", -30, "arms"], ["Head", "Z", -8, "head"]], // hand to the earpiece
  earOpen: [["UpperArmR", "Z", 25, "arms"], ["LowerArmR", "Z", 75, "arms"], ["LowerArmR", "X", -30, "arms"], ["Head", "Z", -6, "head"], ["UpperArmL", "Z", 22, "arms"], ["LowerArmL", "X", -45, "arms"]], // …and the free hand talking
  phone: [["UpperArmR", "Z", 18, "arms"], ["LowerArmR", "Z", 92, "arms"], ["LowerArmR", "X", -12, "arms"], ["Head", "X", 14, "head"]], // phone held up in front of the face
};

// Each job's day, as a loop of activities: pose, where the eyes go, whether the hands type, how long.
const DAYS = {
  read: [ // Ара: replying, then reading the inbox on the side monitor
    { pose: "hands", look: "laptop", typing: true, dur: [3, 5] },
    { pose: "rest", look: "monitor", typing: false, dur: [3, 5] },
    { pose: "hands", look: "laptop", typing: true, dur: [2, 4] },
    { pose: "rest", look: "up", typing: false, dur: [1.5, 2.5] },
  ],
  chart: [ // Веда: between the report on the laptop and the chart on the monitor
    { pose: "mouse", look: "monitor", typing: false, dur: [3, 5] },
    { pose: "hands", look: "laptop", typing: true, dur: [3, 4] },
    { pose: "mouse", look: "monitor", typing: false, dur: [2, 4] },
    { pose: "rest", look: "monitor", typing: false, dur: [2, 3] },
  ],
  phone: [ // Эхо: on the call, taking notes with the free hand, talking with it
    { pose: "ear", look: "ahead", typing: false, dur: [4, 6], nod: true },
    { pose: "ear", look: "laptop", typing: "left", dur: [2.5, 4] },
    { pose: "earOpen", look: "ahead", typing: false, dur: [2, 3], nod: true },
  ],
  type: [ // Нова: sending, then checking replies on her phone
    { pose: "hands", look: "laptop", typing: true, dur: [4, 6] },
    { pose: "phone", look: "phone", typing: false, dur: [3, 4.5], phone: true },
    { pose: "hands", look: "laptop", typing: true, dur: [3, 5] },
    { pose: "rest", look: "monitor", typing: false, dur: [2, 3] },
  ],
};
const BLEND_TIME = 0.6;

export class Person {
  constructor(id, gltf, desk, chair, opts = {}) {
    this.id = id;
    this.desk = desk;
    this.chair = chair;
    this.live = desk.live;
    this.variant = desk.variant;
    this.targets = opts.targets || {}; // world points the eyes go to: laptop, monitor
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
    for (const name of TOUCHED.concat(["WristR"])) if (!this.bones[name]) throw new Error(`${id}: rig has no bone ${name}`);
    // The mixer only writes a bone when its clip value changed since the last frame, so a bone we
    // rotate on top of the clip would otherwise keep our rotation and accumulate. Remember the clip's
    // value and our last output for every touched bone, and start each frame from the clip's value.
    this.clipQ = {}; this.outQ = {};
    for (const name of TOUCHED) { this.clipQ[name] = this.bones[name].quaternion.clone(); this.outQ[name] = new THREE.Quaternion(NaN, NaN, NaN, NaN); }

    this.mixer = new THREE.AnimationMixer(this.obj);
    this.actions = {};
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    for (const n of ["Idle", "Wave"]) if (!this.actions[n]) throw new Error(`${id}: model has no ${n} clip`);
    this.current = this.actions.Idle; this.current.play(); this.current.timeScale = 0.55;

    this.w = { legs: 1, arms: 1, head: 1, look: 0 }; // pose weights
    this.wTarget = { legs: 1, arms: 1, head: 1, look: 0 };
    this.day = DAYS[this.variant] || DAYS.type;
    this.step = -1; this.prev = this.day[0]; this.act = this.day[0]; this.mix = 1; this.actUntil = 0;
    this.lean = { at: between(18, 28) };
    this.greeting = false;
    this.props = { handPhone: null, deskPhone: null, headset: null };
    this.lookPoint = new THREE.Vector3();

    // scale to height, then find how far the hips sit above the origin in the seated pose
    this.mixer.update(0);
    this.beginPose();
    const box = measure(this.obj);
    this.obj.scale.multiplyScalar((opts.height || 1.68) / (box.max.y - box.min.y));
    this.applyPose(SEATED, 1);
    this.endPose();
    this.obj.updateMatrixWorld(true);
    const hipY = this.bones.Hips.getWorldPosition(new THREE.Vector3()).y - this.obj.position.y;
    this.seatedY = (opts.seatHeight || 0.48) - hipY;

    // on the seat, facing the way the desk faces
    const f = new THREE.Vector3(Math.sin(desk.dir), 0, Math.cos(desk.dir));
    this.seat = new THREE.Vector3(desk.x - f.x * opts.seatBack, 0, desk.z - f.z * opts.seatBack);
    this.obj.position.set(this.seat.x, this.seatedY, this.seat.z);
    this.obj.rotation.y = desk.dir;
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

  // rotate bones by a pose list, scaled by the group weights and an overall factor
  applyPose(list, k) {
    if (k <= 0.001) return;
    for (const [name, ax, deg, group] of list) {
      const w = this.w[group] * k; if (w <= 0.001) continue;
      this.bones[name]["rotate" + ax](d2r(deg) * w);
    }
  }

  // ---------------------------------------------------------------- props
  // Эхо's headset, on the head bone
  addHeadset() {
    const head = this.bones.Head;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.4, metalness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 8, 24, Math.PI), mat); band.position.y = 0.02; g.add(band);
    [-1, 1].forEach((s) => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), mat); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.105, 0, 0); g.add(cup); });
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6), mat); boom.position.set(-0.09, -0.05, 0.06); boom.rotation.set(d2r(-70), 0, d2r(-20)); g.add(boom);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6 })); mic.position.set(-0.075, -0.1, 0.11); g.add(mic);
    const s = new THREE.Vector3(); head.getWorldScale(s);
    g.scale.setScalar(1 / s.x); // the bone's world scale is the model scale; counter it so the prop is in metres
    g.position.set(0, 0.11 / s.x, 0.005 / s.x);
    head.add(g);
    this.props.headset = g;
  }
  // Нова's phone: one lying on the desk, one in her right hand while she reads it
  addPhone(deskPhone) {
    this.props.deskPhone = deskPhone;
    const wrist = this.bones.WristR;
    const s = new THREE.Vector3(); wrist.getWorldScale(s);
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.145, 0.008), new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: 0.35, metalness: 0.5 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.132), new THREE.MeshStandardMaterial({ color: 0x0a1226, emissive: 0x9fc4ff, emissiveIntensity: 0.9 }));
    screen.position.z = 0.0045; phone.add(body, screen);
    phone.scale.setScalar(1 / s.x);
    // held in the palm: a little ahead of the wrist joint, screen toward the face
    phone.position.set(0, 0.07 / s.x, 0.03 / s.x); phone.rotation.set(d2r(-70), 0, 0);
    phone.visible = false;
    wrist.add(phone);
    this.props.handPhone = phone;
  }

  // ---------------------------------------------------------------- behaviour
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
    this.wTarget.arms = 1;
    if (this.current === this.actions.Wave) this.fadeTo(this.actions.Idle, 0.4);
  }
  fadeTo(action, dur, once = false) {
    if (this.current === action && !once) return;
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    action.timeScale = action === this.actions.Idle ? 0.55 : 1;
    action.enabled = true;
    action.play();
    if (this.current !== action) this.current.crossFadeTo(action, dur, false);
    this.current = action;
  }

  // the next activity of the day, when the current one is over
  schedule(t) {
    if (t < this.actUntil) return;
    this.step = (this.step + 1) % this.day.length;
    this.prev = this.act; this.act = this.day[this.step]; this.mix = 0;
    this.actUntil = t + between(this.act.dur[0], this.act.dur[1]) + BLEND_TIME;
  }

  update(dt, t, cameraPos) {
    if (this.current === this.actions.Wave && this.current.time >= this.current.getClip().duration - 0.05) {
      this.fadeTo(this.actions.Idle, 0.4);
      this.wTarget.arms = 1; // hands back to the work, eyes still on the visitor
    }
    this.mixer.update(dt);
    this.beginPose();

    const k = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(this.w)) this.w[key] += (this.wTarget[key] - this.w[key]) * k;
    this.schedule(t);
    this.mix = Math.min(1, this.mix + dt / BLEND_TIME);
    const m = this.mix * this.mix * (3 - 2 * this.mix);

    // body: toward the visitor while greeting, else the way the desk faces; the chair turns with them
    let heading = this.desk.dir;
    if (this.greeting && this.greetFrom) heading = Math.atan2(this.greetFrom.x - this.obj.position.x, this.greetFrom.z - this.obj.position.z);
    this.obj.rotation.y = lerpAngle(this.obj.rotation.y, heading, 1 - Math.exp(-dt * 5));
    if (this.chair) this.chair.rotation.y = this.obj.rotation.y;

    // pose layers, after the clip has written the bones
    let lean = 0;
    if (t > this.lean.at) { const p = (t - this.lean.at) / 3; lean = -d2r(9) * Math.sin(Math.PI * Math.min(1, p)); if (p >= 1) this.lean.at = t + between(22, 34); }
    this.applyPose(SEATED, 1);
    if (lean) this.bones.Torso.rotateX(lean * this.w.legs);
    this.applyPose(POSE[this.prev.pose], 1 - m);
    this.applyPose(POSE[this.act.pose], m);
    this.microTick(t, m);
    this.lookTick(cameraPos, m);
    this.endPose();

    // the phone moves between the desk and the hand with the activity
    if (this.props.handPhone) {
      const inHand = (this.act.phone ? m : 0) + (this.prev.phone ? 1 - m : 0) > 0.5;
      this.props.handPhone.visible = inHand; this.props.deskPhone.visible = !inHand;
    }
  }

  // typing, breathing, nodding on the call, a mouse hand that moves
  microTick(t, m) {
    const B = this.bones, w = this.w.arms;
    const typing = (a, k) => a.typing === true ? k : 0, typingL = (a, k) => a.typing ? k : 0;
    const kT = typing(this.prev, 1 - m) + typing(this.act, m), kL = typingL(this.prev, 1 - m) + typingL(this.act, m);
    if (kL > 0.01) B.LowerArmL.rotateX(Math.sin(t * 12) * d2r(3) * w * kL);
    if (kT > 0.01) B.LowerArmR.rotateX(Math.sin(t * 12 + 2.1) * d2r(3) * w * kT);
    const kM = (this.prev.pose === "mouse" ? 1 - m : 0) + (this.act.pose === "mouse" ? m : 0);
    if (kM > 0.01) { B.LowerArmR.rotateY(Math.sin(t * 1.7) * d2r(4) * w * kM); B.LowerArmR.rotateX(Math.sin(t * 2.3) * d2r(2) * w * kM); }
    B.Torso.rotateX(Math.sin(t * 1.4) * d2r(0.7) * this.w.legs); // breathing
    const kN = (this.prev.nod ? 1 - m : 0) + (this.act.nod ? m : 0);
    if (kN > 0.01) { const nod = Math.max(0, Math.sin(t * 2.4)) * (Math.sin(t * 0.3) > 0 ? 1 : 0.25); B.Head.rotateX(nod * d2r(4) * this.w.head * kN); }
  }

  // where the eyes go: the activity's target, or the visitor while greeting
  lookTick(cameraPos, m) {
    if (this.greeting && cameraPos) { this.lookAt(cameraPos, this.w.look); return; }
    const point = (a) => {
      if (a.look === "phone" && this.props.handPhone) return this.props.handPhone.getWorldPosition(new THREE.Vector3());
      if (a.look === "up") return this.forwardPoint(3, 0.6);
      if (a.look === "ahead") return this.forwardPoint(3, 0);
      return this.targets[a.look] || this.forwardPoint(1, 0);
    };
    const target = point(this.act), from = point(this.prev);
    this.lookPoint.lerpVectors(from, target, m);
    // small drifts so the gaze is never locked
    this.lookPoint.x += Math.sin(performance.now() / 1300) * 0.05; this.lookPoint.y += Math.sin(performance.now() / 900) * 0.03;
    this.lookAt(this.lookPoint, this.w.head);
  }
  forwardPoint(dist, up) {
    const f = new THREE.Vector3(Math.sin(this.obj.rotation.y), 0, Math.cos(this.obj.rotation.y));
    return this.obj.position.clone().addScaledVector(f, dist).add(new THREE.Vector3(0, 1.1 + up, 0));
  }
  // Turn the head toward a world point, within what a neck can do.
  lookAt(point, weight) {
    const head = this.bones.Head;
    const hp = head.getWorldPosition(new THREE.Vector3());
    // in the character's own space +z is forward; the head bone yaws about its local Y and nods about local X
    const d = this.obj.worldToLocal(point.clone()).sub(this.obj.worldToLocal(hp.clone()));
    const yaw = Math.atan2(d.x, d.z), pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    const cy = Math.max(-d2r(60), Math.min(d2r(60), yaw)), cp = Math.max(-d2r(25), Math.min(d2r(30), pitch));
    head.rotateY(cy * weight); head.rotateX(cp * weight * 0.7);
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
