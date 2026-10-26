import { triangulateChip, type TriangulateOptions } from "../transitions/triangulate";

/** Worker de T8: la triangulación de Delaunay del chip fuera del hilo principal. */
self.onmessage = (event: MessageEvent<TriangulateOptions>) => {
  const result = triangulateChip(event.data);
  (self as unknown as Worker).postMessage(result, [
    result.points.buffer,
    result.triangles.buffer,
    result.shade.buffer,
    result.edges.buffer,
  ]);
};
