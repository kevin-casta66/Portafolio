import type { ReactNode } from "react";
import { ChipIllustration, type ChipCore } from "./Runtime/ChipIllustration";
import "@/styles/phase-illustration.css";

/**
 * Ilustración 2D de una fase (change 09): SVG inline, decorativo (`aria-hidden`; el contenido real
 * está siempre en el DOM de la sección), con colores solo de tokens (acento de la fase, `--border`,
 * `--surface`…, vía `styles/phase-illustration.css`) y por tanto correcto en ambos temas.
 *
 * Es el MISMO componente para los dos modos sin escena 3D en movimiento (design D5):
 *   · `reduced`    → estático (todo el trazo dibujado, sin animación);
 *   · `fallback2d` → el CSS añade animaciones ligeras (flujo de trazo, aparición ligada al scroll).
 * En `full` queda oculto (`display: none`) porque el canvas 3D dibuja la escena. La visibilidad la
 * decide el atributo `data-experience` de `<html>` (lib/experience.ts), así no hay flash ni dependencia
 * de la hidratación.
 *
 * Cada ilustración cuenta la misma transformación que su escena: token → nodo → instrucción → proceso
 * → vértice → píxel (+ bloques de memoria para `/heap`).
 */
export type IllustrationPhase =
  "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu" | "display" | "heap";

export type { ChipCore };

interface PhaseIllustrationProps {
  phase: IllustrationPhase;
  className?: string;
  /** Solo `runtime`: un núcleo por proyecto (por defecto 6 genéricos). */
  cores?: ChipCore[] | undefined;
  /** Solo `runtime`: núcleo resaltado (hover / foco / selección en las tarjetas y el chip). */
  activeCore?: string | null | undefined;
}

const W = 640;
const H = 240;

/** Trazo con `pathLength` normalizado: el CSS lo dibuja con `stroke-dashoffset`. */
function Draw({ d, cls = "pi-line", delay = 0 }: { d: string; cls?: string; delay?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`${cls} pi-draw`}
      style={delay ? ({ "--pi-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    />
  );
}

function Label({
  x,
  y,
  children,
  anchor = "start",
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="pi-text">
      {children}
    </text>
  );
}

function Source() {
  // Tokens de la línea `const dev = new Developer("…")` con su ancho aproximado, en una sola fila.
  const tokens: [string, number][] = [
    ["const", 50],
    ["dev", 36],
    ["=", 22],
    ["new", 38],
    ["Developer", 80],
    ['("…")', 52],
  ];
  let cursor = 62;
  return (
    <>
      <rect x={40} y={36} width={400} height={170} rx={8} className="pi-panel" />
      <line x1={40} y1={64} x2={440} y2={64} className="pi-line pi-dim" />
      <Label x={56} y={55}>
        main.ts
      </Label>
      <Label x={52} y={96}>
        1
      </Label>
      <Label x={52} y={129}>
        2
      </Label>
      <Label x={52} y={160}>
        3
      </Label>
      <line x1={70} y1={92} x2={170} y2={92} className="pi-line pi-dim" />
      {tokens.map(([text, w], i) => {
        const x = cursor;
        cursor += w + 8;
        return (
          <g
            key={text}
            className="pi-fade"
            style={{ "--pi-delay": `${i * 120}ms` } as React.CSSProperties}
          >
            <rect
              x={x}
              y={112}
              width={w}
              height={26}
              rx={5}
              className={i === 4 ? "pi-block pi-hot" : "pi-block"}
            />
            <Label x={x + w / 2} y={129} anchor="middle">
              {text}
            </Label>
          </g>
        );
      })}
      <line x1={70} y1={160} x2={230} y2={160} className="pi-line pi-dim" />
      <rect x={70} y={174} width={9} height={16} className="pi-fill pi-caret" />
      <Draw d="M 452 125 H 512 M 500 113 L 514 125 L 500 137" delay={500} />
      <rect x={524} y={96} width={86} height={58} rx={8} className="pi-panel pi-hot" />
      <Label x={567} y={130} anchor="middle">
        tokens
      </Label>
    </>
  );
}

function Lexer() {
  const lanes = ["keyword", "identifier", "string", "number"];
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={40}
          y={34 + i * 32}
          width={64 + (i % 3) * 14}
          height={22}
          rx={5}
          className="pi-block pi-fade"
          style={{ "--pi-delay": `${i * 90}ms` } as React.CSSProperties}
        />
      ))}
      {lanes.map((lane, i) => {
        const y = 52 + i * 46;
        return (
          <g key={lane}>
            <Draw
              d={`M 130 ${50 + i * 28} C 220 ${50 + i * 28}, 230 ${y}, 320 ${y} H 600`}
              delay={i * 140}
              cls={i === 0 ? "pi-line pi-hot" : "pi-line"}
            />
            <rect x={320} y={y - 14} width={280} height={28} rx={6} className="pi-panel" />
            <Label x={332} y={y + 5}>
              {lane}
            </Label>
            {[0, 1, 2].map((k) => (
              <circle
                key={k}
                cx={470 + k * 38}
                cy={y}
                r={7}
                className={k === 0 ? "pi-fill pi-hot" : "pi-fill"}
              />
            ))}
          </g>
        );
      })}
    </>
  );
}

function Parser() {
  const nodes: [number, number, boolean][] = [
    [320, 40, true],
    [190, 100, false],
    [450, 100, false],
    [120, 170, false],
    [250, 170, false],
    [390, 170, false],
    [510, 170, false],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ];
  return (
    <>
      {edges.map(([a, b], i) => {
        const [x1, y1] = nodes[a]!;
        const [x2, y2] = nodes[b]!;
        return (
          <Draw
            key={i}
            d={`M ${x1} ${y1 + 16} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2 - 16}`}
            delay={i * 120}
          />
        );
      })}
      {nodes.map(([cx, cy, root], i) => (
        <g
          key={i}
          className="pi-fade"
          style={{ "--pi-delay": `${i * 100}ms` } as React.CSSProperties}
        >
          <circle cx={cx} cy={cy} r={16} className={root ? "pi-panel pi-hot" : "pi-panel"} />
          <circle cx={cx} cy={cy} r={4} className="pi-fill" />
        </g>
      ))}
      <Label x={320} y={H - 12} anchor="middle">
        AST
      </Label>
    </>
  );
}

function Bytecode() {
  const ops = ["LOAD", "PUSH", "ADD", "CALL", "STORE", "JMP", "RET"];
  return (
    <>
      <Label x={56} y={26}>
        0x00
      </Label>
      {ops.map((op, i) => (
        <g
          key={op}
          className="pi-fade"
          style={{ "--pi-delay": `${i * 90}ms` } as React.CSSProperties}
        >
          <rect
            x={90}
            y={34 + i * 28}
            width={260}
            height={22}
            rx={4}
            className={i === 3 ? "pi-block pi-hot" : "pi-block"}
          />
          <Label x={56} y={50 + i * 28}>{`0${i}`}</Label>
          <Label x={104} y={50 + i * 28}>
            {op}
          </Label>
          <rect
            x={230}
            y={41 + i * 28}
            width={30 + ((i * 37) % 70)}
            height={8}
            rx={2}
            className="pi-fill pi-dim"
          />
        </g>
      ))}
      <path d="M 66 134 L 80 142 L 66 150 Z" className="pi-fill pi-hot" />
      <Draw d="M 370 130 H 430 M 418 118 L 432 130 L 418 142" delay={300} />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x={450} y={62 + r * 36} width={140} height={26} rx={5} className="pi-panel" />
          <Label x={462} y={80 + r * 36}>{`r${r}`}</Label>
          <rect
            x={496}
            y={69 + r * 36}
            width={20 + ((r * 41) % 60)}
            height={12}
            rx={2}
            className="pi-fill pi-hot"
          />
        </g>
      ))}
    </>
  );
}

function Gpu() {
  const dots: [number, number][] = [
    [70, 70],
    [150, 50],
    [190, 120],
    [90, 150],
  ];
  const grid = Array.from({ length: 36 }, (_, i) => i);
  return (
    <>
      {/* 1 · vértices */}
      {dots.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={6}
          className="pi-fill pi-hot pi-fade"
          style={{ "--pi-delay": `${i * 120}ms` } as React.CSSProperties}
        />
      ))}
      {/* 2 · triángulos */}
      <Draw
        d="M 250 150 L 300 50 L 350 150 Z M 300 50 L 300 150"
        delay={200}
        cls="pi-line pi-hot"
      />
      {/* 3 · rasterización */}
      <Draw d="M 410 150 L 460 50 L 510 150 Z" delay={400} />
      {grid.map((i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = 420 + col * 14;
        const y = 90 + row * 10;
        const inside = Math.abs(x + 7 - 460) < (y - 50) * 0.5;
        return inside ? (
          <rect
            key={i}
            x={x}
            y={y}
            width={10}
            height={7}
            className="pi-fill pi-fade"
            style={{ "--pi-delay": `${600 + i * 20}ms` } as React.CSSProperties}
          />
        ) : null;
      })}
      {/* 4 · píxeles */}
      {Array.from({ length: 24 }, (_, i) => (
        <rect
          key={i}
          x={540 + (i % 6) * 16}
          y={60 + Math.floor(i / 6) * 22}
          width={12}
          height={16}
          className={i % 5 === 0 ? "pi-fill pi-hot" : "pi-block"}
        />
      ))}
      {[
        [205, 100],
        [365, 100],
        [525, 100],
      ].map(([x, y]) => (
        <Draw
          key={x}
          d={`M ${x! - 12} ${y} H ${x! + 12} M ${x! + 4} ${y! - 8} L ${x! + 14} ${y} L ${x! + 4} ${y! + 8}`}
        />
      ))}
      {["vertices", "triangles", "raster", "pixels"].map((s, i) => (
        <Label key={s} x={[130, 300, 460, 588][i]!} y={196} anchor="middle">
          {s}
        </Label>
      ))}
    </>
  );
}

function Display() {
  return (
    <>
      <defs>
        <linearGradient id="pi-spectrum" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="pi-stop-a" />
          <stop offset="0.35" className="pi-stop-b" />
          <stop offset="0.7" className="pi-stop-c" />
          <stop offset="1" className="pi-stop-d" />
        </linearGradient>
      </defs>
      <rect x={150} y={24} width={340} height={174} rx={12} className="pi-bezel" />
      <rect x={162} y={36} width={316} height={150} rx={6} className="pi-panel" />
      <rect x={182} y={54} width={130} height={10} rx={3} className="pi-fill pi-dim" />
      <rect x={182} y={78} width={276} height={22} rx={5} className="pi-block pi-fade" />
      <rect
        x={182}
        y={110}
        width={276}
        height={22}
        rx={5}
        className="pi-block pi-fade"
        style={{ "--pi-delay": "120ms" } as React.CSSProperties}
      />
      <rect
        x={182}
        y={146}
        width={100}
        height={26}
        rx={6}
        className="pi-fill pi-hot pi-fade"
        style={{ "--pi-delay": "240ms" } as React.CSSProperties}
      />
      <Draw d="M 290 198 L 280 222 H 360 L 350 198" />
      <Draw d="M 40 112 H 140 M 128 100 L 142 112 L 128 124" delay={200} cls="pi-line pi-hot" />
      <Label x={90} y={140} anchor="middle">
        200
      </Label>
    </>
  );
}

function Heap() {
  const blocks: [number, number, number, number][] = [
    [40, 30, 120, 70],
    [168, 30, 70, 70],
    [246, 30, 150, 70],
    [404, 30, 90, 70],
    [502, 30, 98, 70],
    [40, 108, 80, 100],
    [128, 108, 130, 48],
    [128, 164, 130, 44],
    [266, 108, 100, 100],
    [374, 108, 120, 48],
    [374, 164, 226, 44],
    [502, 108, 98, 48],
  ];
  return (
    <>
      {blocks.map(([x, y, w, h], i) => (
        <g
          key={i}
          className="pi-fade"
          style={{ "--pi-delay": `${i * 70}ms` } as React.CSSProperties}
        >
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={6}
            className={i % 4 === 1 ? "pi-block pi-hot" : "pi-block"}
          />
          <rect
            x={x + 10}
            y={y + 10}
            width={Math.min(36, w - 20)}
            height={6}
            rx={2}
            className="pi-fill pi-dim"
          />
          <rect
            x={x + 10}
            y={y + 22}
            width={Math.max(12, (w - 20) * 0.6)}
            height={5}
            rx={2}
            className="pi-fill pi-dim"
          />
        </g>
      ))}
    </>
  );
}

const BODIES: Record<Exclude<IllustrationPhase, "runtime">, () => ReactNode> = {
  source: Source,
  lexer: Lexer,
  parser: Parser,
  bytecode: Bytecode,
  gpu: Gpu,
  display: Display,
  heap: Heap,
};

export function PhaseIllustration({ phase, className, cores, activeCore }: PhaseIllustrationProps) {
  const Body = phase === "runtime" ? null : BODIES[phase];
  return (
    <div
      aria-hidden="true"
      data-phase-illustration={phase}
      className={className ? `phase-illustration ${className}` : "phase-illustration"}
    >
      {phase === "runtime" ? (
        <ChipIllustration cores={cores} activeCore={activeCore} />
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pi-svg"
          preserveAspectRatio="xMidYMid meet"
          focusable="false"
        >
          {Body ? <Body /> : null}
        </svg>
      )}
    </div>
  );
}
