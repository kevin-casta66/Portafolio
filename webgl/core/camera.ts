import { OrthographicCamera } from "three/webgpu";

/**
 * Cámara ortográfica «a escala de píxel»: 1 unidad de mundo = 1 px CSS, x a la derecha y la y del
 * DOM hacia abajo ⇒ y_mundo = −y_DOM. Es la cámara de los gemelos DOM↔3D, de las capas de texto y
 * de las escenas de sección.
 */
export function createPixelCamera(): OrthographicCamera {
  return new OrthographicCamera(0, 1, 0, -1, -1000, 1000);
}

export function fitPixelCamera(camera: OrthographicCamera, width: number, height: number): void {
  if (camera.right === width && camera.bottom === -height) return;
  camera.left = 0;
  camera.right = width;
  camera.top = 0;
  camera.bottom = -height;
  camera.updateProjectionMatrix();
}
