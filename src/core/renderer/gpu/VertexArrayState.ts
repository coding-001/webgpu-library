import VertexArray from '../../VertexArray';
import KeyDefine from '../KeyDefine';

// https://github.com/gpuweb/gpuweb/issues/26
// D3D12 or Metal has no VK_PRIMITIVE_TOPOLOGY_TRIANGLE_FAN

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODE_MAP: any = {
  POINTS: 'point-list',
  LINES: 'line-list',
  LINE_LOOP: '', // TODO
  LINE_STRIP: 'line-strip',
  TRIANGLES: 'triangle-list',
  TRIANGLE_STRIP: 'triangle-strip',
  TRIANGLE_FAN: '', // TODO
};

export default class VertexArrayState {
  private indexBuffer: GPUBuffer;

  private buffers: { buffer: GPUBuffer; offset: number }[] = [];

  private count: number;

  public readonly keys: (string | KeyDefine)[] = [];

  public readonly key: string;

  public readonly primitiveTopology: GPUPrimitiveTopology;

  public readonly vertexState: GPUVertexStateDescriptor = {
    indexFormat: 'uint32',
    vertexBuffers: [],
  };

  private instanceCount = 1;

  public constructor(device: GPUDevice, vao: VertexArray) {
    this.keys.push('uint32');
    if (vao.indexBuffer) {
      const [buffer, arrayBuffer] = device.createBufferMapped({
        size: vao.indexBuffer.byteLength,
        usage: GPUBufferUsage.INDEX,
      });
      if (vao.indexBuffer instanceof Uint16Array) {
        this.vertexState.indexFormat = 'uint16';
        this.keys[0] = 'uint16';
        new Uint16Array(arrayBuffer).set(vao.indexBuffer);
      } else if (vao.indexBuffer instanceof Uint32Array) {
        new Uint32Array(arrayBuffer).set(vao.indexBuffer);
      }
      buffer.unmap();
      this.indexBuffer = buffer;
    }
    let inShaderLocation = 0;
    let outShaderLocation = 0;
    const bufferMap: Map<ArrayBufferView, GPUBuffer> = new Map();
    vao.buffers.forEach((buffer, i) => {
      if (buffer.instanceCount) {
        this.instanceCount = buffer.instanceCount;
      }
      this.keys.push(`buffer${i}`);
      const vertexBuffer: GPUVertexBufferLayoutDescriptor = {
        arrayStride: buffer.arrayStride,
        stepMode: buffer.instanceCount ? 'instance' : 'vertex',
        attributes: new Array<GPUVertexAttributeDescriptor>(),
      };
      this.vertexState.vertexBuffers.push(vertexBuffer);
      buffer.attributes.forEach((attribute) => {
        vertexBuffer.attributes.push({
          offset: attribute.offset || 0,
          format: attribute.format || 'float3',
          shaderLocation: inShaderLocation,
        });
        const name = attribute.name.toUpperCase();
        this.keys.push(new KeyDefine(`IN_${name}`, inShaderLocation));
        if (!buffer.instanceCount) {
          this.keys.push(new KeyDefine(`OUT_${name}`, outShaderLocation));
          if (attribute.name === 'tangent') {
            outShaderLocation += 3;
          } else {
            outShaderLocation += 1;
          }
        }
        inShaderLocation += 1;
      });
      let gpuBuffer = bufferMap.get(buffer.data);
      if (!gpuBuffer) {
        const [mappedBuffer, arrayBuffer] = device.createBufferMapped({
          size: buffer.data.byteLength,
          usage: GPUBufferUsage.VERTEX,
        });
        gpuBuffer = mappedBuffer;
        // TODO: handle other type
        if (buffer.data instanceof Float32Array) {
          new Float32Array(arrayBuffer).set(buffer.data);
        }
        gpuBuffer.unmap();
        bufferMap.set(buffer.data, gpuBuffer);
      }
      this.buffers.push({ buffer: gpuBuffer, offset: buffer.offset || 0 });
    });
    this.count = vao.count;
    this.keys.push(vao.mode);
    this.keys.push(new KeyDefine('NEXT_OUT_LOCATION', outShaderLocation));
    this.key = this.keys.join(',');
    this.primitiveTopology = MODE_MAP[vao.mode];
  }

  public bind(bundleEncoder: GPURenderPassEncoder | GPURenderBundleEncoder): void {
    this.buffers.forEach((buffer, i) => {
      bundleEncoder.setVertexBuffer(i, buffer.buffer, buffer.offset);
    });
    if (this.indexBuffer) {
      bundleEncoder.setIndexBuffer(this.indexBuffer);
    }
  }

  public draw(bundleEncoder: GPURenderPassEncoder | GPURenderBundleEncoder): void {
    if (this.indexBuffer) {
      bundleEncoder.drawIndexed(this.count, this.instanceCount, 0, 0, 0);
    } else {
      bundleEncoder.draw(this.count, this.instanceCount, 0, 0);
    }
  }

  public destroy(): void {
    if (this.indexBuffer) {
      this.indexBuffer.destroy();
      this.indexBuffer = null;
    }
    this.buffers.forEach((buffer) => {
      buffer.buffer.destroy();
    });
    this.buffers = null;
  }
}
