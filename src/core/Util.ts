import { mat3, mat4 } from 'gl-matrix';
import VertexArray from './VertexArray';

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

export function copyMat3ToBuffer(source: mat3, target: Float32Array, offset: number): void {
  for (let i = 0; i < 3; i += 1) {
    const part = new Float32Array(source.buffer, i * 4 * 3, 3);
    target.set(part, offset + i * 4);
  }
}

export function createCubeVao(): VertexArray {
  const cubeArrayBuffer: Float32Array = new Float32Array([
    // Bottom
    +1, -1, +1, 0, -1, 0, 1, 1,
    -1, -1, +1, 0, -1, 0, 0, 1,
    -1, -1, -1, 0, -1, 0, 0, 0,
    +1, -1, -1, 0, -1, 0, 1, 0,
    +1, -1, +1, 0, -1, 0, 1, 1,
    -1, -1, -1, 0, -1, 0, 0, 0,

    // Right
    +1, +1, +1, 1, 0, 0, 1, 1,
    +1, -1, +1, 1, 0, 0, 0, 1,
    +1, -1, -1, 1, 0, 0, 0, 0,
    +1, +1, -1, 1, 0, 0, 1, 0,
    +1, +1, +1, 1, 0, 0, 1, 1,
    +1, -1, -1, 1, 0, 0, 0, 0,

    // Top
    -1, +1, +1, 0, 1, 0, 1, 1,
    +1, +1, +1, 0, 1, 0, 0, 1,
    +1, +1, -1, 0, 1, 0, 0, 0,
    -1, +1, -1, 0, 1, 0, 1, 0,
    -1, +1, +1, 0, 1, 0, 1, 1,
    +1, +1, -1, 0, 1, 0, 0, 0,

    // Left
    -1, -1, +1, -1, 0, 0, 1, 1,
    -1, +1, +1, -1, 0, 0, 0, 1,
    -1, +1, -1, -1, 0, 0, 0, 0,
    -1, -1, -1, -1, 0, 0, 1, 0,
    -1, -1, +1, -1, 0, 0, 1, 1,
    -1, +1, -1, -1, 0, 0, 0, 0,

    // Front
    +1, +1, +1, 0, 0, 1, 1, 1,
    -1, +1, +1, 0, 0, 1, 0, 1,
    -1, -1, +1, 0, 0, 1, 0, 0,
    -1, -1, +1, 0, 0, 1, 0, 0,
    +1, -1, +1, 0, 0, 1, 1, 0,
    +1, +1, +1, 0, 0, 1, 1, 1,

    // Back
    +1, -1, -1, 0, 0, -1, 1, 1,
    -1, -1, -1, 0, 0, -1, 0, 1,
    -1, +1, -1, 0, 0, -1, 0, 0,
    +1, +1, -1, 0, 0, -1, 1, 0,
    +1, -1, -1, 0, 0, -1, 1, 1,
    -1, +1, -1, 0, 0, -1, 0, 0,
  ]);
  return new VertexArray({
    buffers: [
      {
        attributes: [
          {
            name: 'position',
          },
          {
            name: 'normal',
            offset: 4 * 3,
          },
          {
            name: 'uv',
            format: 'float2',
            offset: 4 * (3 + 3),
          },
        ],
        arrayStride: 4 * (3 + 3 + 2),
        data: cubeArrayBuffer,
      },
    ],
    count: 36,
  });
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
