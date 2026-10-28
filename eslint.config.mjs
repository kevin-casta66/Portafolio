import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Prohíbe colores literales: todo color debe venir de un token (styles/tokens.css).
const HEX = String.raw`(^|[\s(,:'"\[])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])`;
const COLOR_FN = String.raw`\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(`;
const CUBIC = String.raw`cubic-bezier\(`;

const colorRules = [HEX, COLOR_FN].flatMap((re) => [
  {
    selector: `Literal[value=/${re}/]`,
    message: "Color literal prohibido: usa un token de styles/tokens.css.",
  },
  {
    selector: `TemplateElement[value.raw=/${re}/]`,
    message: "Color literal prohibido: usa un token de styles/tokens.css.",
  },
]);

// Sin GLSL: todo shader es TSL (NodeMaterial). `ShaderMaterial` y `onBeforeCompile` no funcionan con WebGPURenderer.
const GLSL_MESSAGE = "GLSL prohibido: escribe el shader en TSL (webgl/nodes) con NodeMaterial.";
const glslRules = [
  { selector: "ImportSpecifier[imported.name=/^(ShaderMaterial|RawShaderMaterial)$/]", message: GLSL_MESSAGE },
  { selector: "MemberExpression[property.name=/^(ShaderMaterial|RawShaderMaterial|onBeforeCompile)$/]", message: GLSL_MESSAGE },
  { selector: "NewExpression[callee.name=/^(ShaderMaterial|RawShaderMaterial)$/]", message: GLSL_MESSAGE },
  { selector: "Property[key.name='onBeforeCompile']", message: GLSL_MESSAGE },
];

// Movimiento: easings, duraciones y bucles de frame solo existen dentro de `motion/` (tokens, reloj).
const motionRules = [
  {
    selector: `Literal[value=/${CUBIC}/]`,
    message: "Curva de easing literal prohibida fuera de motion/: usa los tokens de motion/tokens.ts.",
  },
  {
    selector: `TemplateElement[value.raw=/${CUBIC}/]`,
    message: "Curva de easing literal prohibida fuera de motion/: usa los tokens de motion/tokens.ts.",
  },
  {
    selector: "Property[key.name=/^(duration|delay|repeatDelay)$/][value.type='Literal'][value.value>0]",
    message: "Duración numérica literal prohibida fuera de motion/: usa `duration.*` de motion/tokens.ts.",
  },
  {
    selector: "Property[key.name='stagger'][value.type='Literal']",
    message: "Stagger literal prohibido fuera de motion/: usa `stagger.*` de motion/tokens.ts.",
  },
  {
    selector: "Property[key.name='ease'][value.type='Literal']",
    message: "Easing con nombre literal prohibido fuera de motion/: usa `EASE.*` de motion/gsap.ts.",
  },
  {
    selector: "CallExpression[callee.name='requestAnimationFrame']",
    message: "Bucle de frame propio prohibido: suscríbete al reloj único (motion/clock.ts).",
  },
  {
    selector: "CallExpression[callee.property.name='requestAnimationFrame']",
    message: "Bucle de frame propio prohibido: suscríbete al reloj único (motion/clock.ts).",
  },
];

// Las timelines de las transiciones en canvas usan unidades de PROGRESO (0..1), no segundos: pueden
// llevar duraciones y easings propios, pero nunca su propio bucle de frame.
const frameRules = motionRules.filter((rule) => rule.selector.includes("requestAnimationFrame"));

// Vidrio líquido: solo el Call Stack, la terminal y la lente del Heap (change 07) pueden importarlo.
const GLASS_IMPORT = {
  patterns: [
    {
      group: ["**/ui/Glass", "**/ui/Glass.tsx"],
      message:
        "`Glass` (vidrio líquido) solo puede usarse en CallStack, Terminal y la lente del Heap: usa los tokens opacos del tema.",
    },
  ],
};

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "no-restricted-syntax": ["error", ...colorRules, ...motionRules, ...glslRules],
      "no-restricted-imports": ["error", GLASS_IMPORT],
    },
  },
  {
    files: [
      "components/systems/CallStack/**",
      "components/systems/Terminal/**",
      "components/heap/**",
      "components/ui/Glass.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Dentro de motion/ sí pueden vivir duraciones, curvas y el bucle de frame; los colores, no.
  { files: ["motion/**"], rules: { "no-restricted-syntax": ["error", ...colorRules, ...glslRules] } },
  { files: ["webgl/transitions/**"], rules: { "no-restricted-syntax": ["error", ...colorRules, ...frameRules, ...glslRules] } },
  {
    files: ["motion/tokens.ts", "**/*.test.ts", "**/*.test.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    "coverage/**",
    "next-env.d.ts",
    "openspec/**",
    ".claude/**",
    // Scripts de verificación en navegador (Playwright): esperas y tiempos de prueba, no animaciones de la app.
    "scripts/audio/**",
    "scripts/perf/**",
    "scripts/a11y/keyboard.mjs",
  ]),
]);
