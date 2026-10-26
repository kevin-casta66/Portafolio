import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findViolations } from "./check-no-glsl";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "no-glsl-"));
  for (const [name, content] of Object.entries(files)) {
    const full = join(root, name);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe("check:no-glsl", () => {
  it("pasa en limpio", () => {
    const root = project({ "webgl/ok.ts": "import { MeshBasicNodeMaterial } from 'three/webgpu';" });
    expect(findViolations(root)).toEqual([]);
  });

  it("falla con ShaderMaterial, RawShaderMaterial y onBeforeCompile", () => {
    for (const code of [
      "new THREE.ShaderMaterial({})",
      "import { RawShaderMaterial } from 'three'",
      "material.onBeforeCompile = () => {}",
    ]) {
      const root = project({ "webgl/bad.ts": code });
      expect(findViolations(root)).toHaveLength(1);
    }
  });

  it("falla con archivos .glsl, .vert y .frag", () => {
    for (const ext of ["glsl", "vert", "frag"]) {
      const root = project({ [`webgl/shader.${ext}`]: "void main() {}" });
      expect(findViolations(root).map((v) => v.reason)).toEqual([`archivo .${ext}`]);
    }
  });

  it("ignora node_modules y docs", () => {
    const root = project({ "node_modules/x/a.glsl": "", "docs/n.md": "ShaderMaterial" });
    expect(findViolations(root)).toEqual([]);
  });
});
