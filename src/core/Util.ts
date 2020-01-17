import { vec3, mat3, mat4 } from 'gl-matrix';
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

export function createSphereVao(radius = 1, widthSegments = 32, heightSegments = 32, phiStart = 0,
  phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI): VertexArray {
  const thetaEnd = thetaStart + thetaLength;

  let index = 0;
  const grid = [];

  const vertex = vec3.create();
  const normal = vec3.create();

  const indices = [];
  const vertices = [];
  const normals = [];
  const uvs = [];

  for (let iy = 0; iy <= heightSegments; iy += 1) {
    const verticesRow = [];
    const v = iy / heightSegments;
    for (let ix = 0; ix <= widthSegments; ix += 1) {
      const u = ix / widthSegments;

      vertex[0] = -radius * Math.cos(phiStart + u * phiLength)
        * Math.sin(thetaStart + v * thetaLength);
      vertex[1] = radius * Math.cos(thetaStart + v * thetaLength);
      vertex[2] = radius * Math.sin(phiStart + u * phiLength)
        * Math.sin(thetaStart + v * thetaLength);

      vertices.push(vertex[0], vertex[1], vertex[2]);
      vec3.normalize(normal, vertex);
      normals.push(normal[0], normal[1], normal[2]);
      uvs.push(u, 1 - v);
      verticesRow.push(index);
      index += 1;
    }
    grid.push(verticesRow);
  }

  for (let iy = 0; iy < heightSegments; iy += 1) {
    for (let ix = 0; ix < widthSegments; ix += 1) {
      const a = grid[iy][ix + 1];
      const b = grid[iy][ix];
      const c = grid[iy + 1][ix];
      const d = grid[iy + 1][ix + 1];

      if (iy !== 0 || thetaStart > 0) {
        indices.push(a, b, d);
      }
      if (iy !== heightSegments - 1 || thetaEnd < Math.PI) {
        indices.push(b, c, d);
      }
    }
  }

  return new VertexArray({
    indexBuffer: new Uint32Array(indices),
    buffers: [{
      attributes: [{
        name: 'position',
      }],
      data: new Float32Array(vertices),
      arrayStride: 4 * 3,
    }, {
      attributes: [{
        name: 'normal',
      }],
      data: new Float32Array(normals),
      arrayStride: 4 * 3,
    }, {
      attributes: [{
        name: 'uv',
        format: 'float2',
      }],
      data: new Float32Array(uvs),
      arrayStride: 4 * 2,
    }],
    count: indices.length,
  });
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
