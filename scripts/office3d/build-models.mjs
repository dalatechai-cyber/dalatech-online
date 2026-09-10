// Builds the /office 3D assets from the source packs in assets-src/office/3d
// (not committed: Kenney Furniture Kit and Quaternius Ultimate Modular
// Characters, both CC0). Output goes to public/office/models as meshopt-
// compressed GLBs that three.js decodes with its bundled decoder.
//
//   node scripts/office3d/build-models.mjs
//
// Characters: keep only the clips the office uses, drop the rest (~24 combat
// clips make up most of each 3 MB file). Furniture: the pieces the room uses,
// merged into one file, one scene per piece, named after the source file.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample, quantize, meshopt, join, flatten, mergeDocuments, unpartition, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(root, "assets-src/office/3d");
const OUT = path.join(root, "public/office/models");

const CHARACTERS = {
  ara: "quaternius/women/Casual.gltf",
  veda: "quaternius/women/Formal.gltf",
  nova: "quaternius/women/Suit.gltf",
  eho: "quaternius/men/Suit.gltf",
};
const KEEP_CLIPS = new Set(["Idle", "Walk", "Wave", "Interact"]);

const FURNITURE = [
  "desk", "chairDesk", "computerScreen", "computerKeyboard", "computerMouse", "lampSquareTable",
  "plantSmall1", "plantSmall2", "plantSmall3", "radio", "books",
  "bookcaseOpen", "cabinetTelevision", "pottedPlant", "coatRackStanding", "sideTable", "kitchenCoffeeMachine",
  "loungeSofa", "tableCoffee", "rugRectangle", "cardboardBoxClosed", "trashcan", "lampRoundFloor", "kitchenFridgeSmall",
];

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
fs.mkdirSync(OUT, { recursive: true });

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + " KB";

for (const [id, rel] of Object.entries(CHARACTERS)) {
  const doc = await io.read(path.join(SRC, rel));
  for (const anim of doc.getRoot().listAnimations()) {
    if (KEEP_CLIPS.has(anim.getName())) continue;
    // channels and samplers are their own properties; disposing only the clip leaves their accessors referenced
    anim.listChannels().forEach((c) => c.dispose());
    anim.listSamplers().forEach((s) => s.dispose());
    anim.dispose();
  }
  // The characters are flat-shaded low-poly: every triangle carries its own split normals, which
  // triples the vertex count. Drop the normals and weld; the engine renders them with flatShading,
  // which derives the same face normals in the shader.
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const n = prim.getAttribute("NORMAL"); if (n) { prim.setAttribute("NORMAL", null); n.dispose(); }
  }
  await doc.transform(weld(), dedup(), prune(), resample(), quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const out = path.join(OUT, `${id}.glb`);
  await io.write(out, doc);
  console.log(id, "<-", rel, kb(out), "clips:", doc.getRoot().listAnimations().map((a) => a.getName()).join(","));
}

// Furniture: read each piece, then merge into one document with one scene each.
const merged = await io.read(path.join(SRC, "kenney/3d/furniture", FURNITURE[0] + ".glb"));
merged.getRoot().listScenes()[0].setName(FURNITURE[0]);
for (const name of FURNITURE.slice(1)) {
  const piece = await io.read(path.join(SRC, "kenney/3d/furniture", name + ".glb"));
  piece.getRoot().listScenes()[0].setName(name);
  mergeDocuments(merged, piece);
}
// merge() leaves each document's default scene; the file's default scene is the first.
await merged.transform(unpartition(), flatten(), join({ keepNamed: false }), dedup(), prune(), quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
const fout = path.join(OUT, "furniture.glb");
await io.write(fout, merged);
console.log("furniture.glb", kb(fout), "scenes:", merged.getRoot().listScenes().length, merged.getRoot().listScenes().map((s) => s.getName()).join(","));
