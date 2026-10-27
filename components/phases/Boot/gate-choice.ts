import type { AudioEvent } from "@/audio";
import type { BootChoice } from "./boot-controller";

/**
 * Lo que ocurre al elegir en la puerta de arranque: la elección se REGISTRA en el estado de la puerta
 * (`gateChoice`, sessionStorage) y en las preferencias guardadas (`prefs.sound`), y solo entonces se
 * avisa al audio. Nada suena antes de este punto (sin motor cargado, los eventos se descartan).
 * Se separa del componente para poder probarlo sin navegador.
 */
export function applyGateChoice(
  choice: BootChoice,
  deps: {
    setGateChoice: (choice: BootChoice) => void;
    emit: (event: Extract<AudioEvent, "gate:sound" | "gate:silent">) => void;
  },
): void {
  deps.setGateChoice(choice);
  deps.emit(choice === "sound" ? "gate:sound" : "gate:silent");
}
