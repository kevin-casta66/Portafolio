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

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  { rules: { "no-restricted-syntax": ["error", ...colorRules, ...motionRules] } },
  // Dentro de motion/ sí pueden vivir duraciones, curvas y el bucle de frame; los colores, no.
  { files: ["motion/**"], rules: { "no-restricted-syntax": ["error", ...colorRules] } },
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
  ]),
]);
