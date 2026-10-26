import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, parse } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { dedup, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

/**
 * Pipeline de assets 3D: modelos `webgl/assets-src/*.glb` → `public/webgl/models/*.glb` con
 * gltf-transform (dedup + prune + compresión Meshopt) y texturas `webgl/assets-src/*.png|jpg` →
 * KTX2 con `toktx` (KTX-Software; UASTC para normales, ETC1S para color). `toktx` es un binario
 * externo: si no está en el PATH las texturas se omiten con un aviso (los modelos se procesan igual).
 * Después `pnpm webgl:budget` comprueba que el total siga ≤ 1,5 MB. Hoy el sitio es procedural y no
 * hay assets de origen: el script no hace nada hasta que se añadan.
 */
const root = process.cwd();
const src = join(root, "webgl", "assets-src");
const out = join(root, "public", "webgl", "models");

const hasToktx = spawnSync("toktx", ["--version"], { stdio: "ignore", shell: true }).status === 0;

async function main() {
  if (!existsSync(src)) {
    console.log("optimize-assets: no hay webgl/assets-src (el sitio es procedural): nada que hacer.");
    return;
  }
  mkdirSync(out, { recursive: true });
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions((await import("@gltf-transform/extensions")).ALL_EXTENSIONS);
  io.registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

  for (const file of readdirSync(src)) {
    const { name, ext } = parse(file);
    if (ext === ".glb" || ext === ".gltf") {
      const doc = await io.read(join(src, file));
      await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
      await io.write(join(out, `${name}.glb`), doc);
      console.log(`  modelo: ${file} → models/${name}.glb (Meshopt)`);
    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      if (!hasToktx) {
        console.warn(`  textura ${file}: toktx no está instalado; se omite (instala KTX-Software para generar KTX2).`);
        continue;
      }
      const normal = /normal/i.test(name);
      const args = normal ? ["--t2", "--encode", "uastc", "--genmipmap"] : ["--t2", "--encode", "etc1s", "--genmipmap"];
      const result = spawnSync("toktx", [...args, join(out, `${name}.ktx2`), join(src, file)], { stdio: "inherit", shell: true });
      if (result.status !== 0) process.exit(result.status ?? 1);
      console.log(`  textura: ${file} → models/${name}.ktx2 (${normal ? "UASTC" : "ETC1S"})`);
    }
  }
}

void main();
