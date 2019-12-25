import { mat4 } from 'gl-matrix';

export function getClientPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if (e instanceof MouseEvent) {
    return {
      x: e.clientX,
      y: e.clientY,
    };
  }
  return {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
  };
}

// https://gpuweb.github.io/gpuweb/#coordinate-systems
export function perspective(
  out: mat4, fovy: number, aspect: number, near: number, far: number,
): mat4 {
  const f = 1.0 / Math.tan(fovy * 0.5);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = far * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = near * far * nf;
  out[15] = 0;
  return out;
}
