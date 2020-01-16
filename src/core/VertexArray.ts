export type VertexArrayMode =
  | 'POINTS'
  | 'LINES'
  | 'LINE_LOOP'
  | 'LINE_STRIP'
  | 'TRIANGLES'
  | 'TRIANGLE_STRIP'
  | 'TRIANGLE_FAN';

export type VertexFormat =
  | 'uchar2'
  | 'uchar4'
  | 'char2'
  | 'char4'
  | 'uchar2norm'
  | 'uchar4norm'
  | 'char2norm'
  | 'char4norm'
  | 'ushort2'
  | 'ushort4'
  | 'short2'
  | 'short4'
  | 'ushort2norm'
  | 'ushort4norm'
  | 'short2norm'
  | 'short4norm'
  | 'half2'
  | 'half4'
  | 'float'
  | 'float2'
  | 'float3'
  | 'float4'
  | 'uint'
  | 'uint2'
  | 'uint3'
  | 'uint4'
  | 'int'
  | 'int2'
  | 'int3'
  | 'int4';

export interface VertexArrayBufferDescriptor {
  arrayStride: number;
  data: ArrayBufferView;
  attributes: {
    name: string;
    offset?: number;
    format?: VertexFormat;
  }[];
  instanceCount?: number;
  offset?: number;
}

let lastID = 0;

export interface VertexArrayDescriptor {
  buffers: VertexArrayBufferDescriptor[];
  indexBuffer?: ArrayBufferView;
  count: number;
  mode?: VertexArrayMode;
}

export default class VertexArray {
  public readonly id: number;

  public readonly buffers: VertexArrayBufferDescriptor[];

  public readonly indexBuffer?: ArrayBufferView;

  public readonly count: number;

  public readonly mode?: VertexArrayMode;

  public constructor(options: VertexArrayDescriptor) {
    lastID += 1;
    this.id = lastID;
    this.buffers = options.buffers;
    this.indexBuffer = options.indexBuffer;
    this.count = options.count;
    this.mode = options.mode || 'TRIANGLES';
  }

  public addBuffer(buffer: VertexArrayBufferDescriptor): void {
    this.buffers.push(buffer);
  }
}
