import { describe, expect, it, vi } from "vitest";
import {
  SHORTCUTS,
  dispatchShortcut,
  isEditableTarget,
  resolveShortcut,
  type KeyEventLike,
  type ShortcutActions,
} from "./shortcuts";

const body = { tagName: "BODY", isContentEditable: false };
const textarea = { tagName: "TEXTAREA", isContentEditable: false };
const key = (k: string, extra: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target: body,
  ...extra,
});
const actions = (): ShortcutActions => ({
  terminal: vi.fn(),
  help: vi.fn(),
  "quick-view": vi.fn(),
  debug: vi.fn(),
  theme: vi.fn(),
  sound: vi.fn(),
});

describe("atajos globales", () => {
  it("cada atajo documentado ejecuta su acción", () => {
    const a = actions();
    expect(dispatchShortcut(key("~"), a)).toBe("terminal");
    expect(dispatchShortcut(key("?"), a)).toBe("help");
    expect(dispatchShortcut(key("q"), a)).toBe("quick-view");
    expect(dispatchShortcut(key("D"), a)).toBe("debug");
    expect(dispatchShortcut(key("t"), a)).toBe("theme");
    expect(dispatchShortcut(key("m"), a)).toBe("sound");
    for (const id of Object.keys(a) as (keyof ShortcutActions)[]) expect(a[id]).toHaveBeenCalledOnce();
  });

  it("`?` y `~` escritos en un textarea no disparan acciones", () => {
    const a = actions();
    expect(dispatchShortcut(key("?", { target: textarea }), a)).toBeNull();
    expect(dispatchShortcut(key("~", { target: textarea }), a)).toBeNull();
    for (const fn of Object.values(a)) expect(fn).not.toHaveBeenCalled();
  });

  it("se ignoran en inputs, selects y contenido editable", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", getAttribute: (n) => (n === "role" ? "textbox" : null) })).toBe(true);
    expect(isEditableTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it("no pisa atajos del navegador: Ctrl/Cmd/Alt + letra se dejan pasar", () => {
    expect(resolveShortcut(key("d", { ctrlKey: true }))).toBeNull();
    expect(resolveShortcut(key("t", { metaKey: true }))).toBeNull();
    expect(resolveShortcut(key("q", { altKey: true }))).toBeNull();
  });

  it("la terminal también se abre con la tecla física de acento grave y con AltGr+4 (teclado español)", () => {
    expect(resolveShortcut(key("`", { code: "Backquote" }))).toBe("terminal");
    expect(resolveShortcut(key("º", { code: "Backquote" }))).toBe("terminal");
    expect(
      resolveShortcut(key("~", { ctrlKey: true, altKey: true, getModifierState: (k) => k === "AltGraph" })),
    ).toBe("terminal");
  });

  it("ignora la repetición de teclas y los eventos ya gestionados", () => {
    expect(resolveShortcut(key("d", { repeat: true }))).toBeNull();
    expect(resolveShortcut(key("d", { defaultPrevented: true }))).toBeNull();
  });

  it("todos los atajos tienen tecla, descripción en ambos idiomas e id único", () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.description.es.length).toBeGreaterThan(0);
      expect(s.description.en.length).toBeGreaterThan(0);
    }
  });
});
