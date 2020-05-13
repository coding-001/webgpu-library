import {
  mat3,
  mat4,
  vec3,
  vec4,
} from 'gl-matrix';
import { copyMat3ToBuffer, updateBufferData } from '../../Util';

const tempVec3 = vec3.create();
const tempVec4 = vec4.create();

export default class DataBuffer {
  public readonly buffer: GPUBuffer;

  public readonly size: number;

  private data: Float32Array;

  private offset = 0;

  private device: GPUDevice;

  constructor(device: GPUDevice, size: number, usage: GPUBufferUsageFlags) {
    this.device = device;
    this.size = size;
    this.data = new Float32Array(size);
    this.buffer = device.createBuffer({
      size: this.data.byteLength,
      usage,
    });
  }

  public setVec3(value: vec3, normalize?: boolean): void;

  // eslint-disable-next-line no-dupe-class-members
  public setVec3(value: [number, number, number], normalize?: boolean): void;

  // eslint-disable-next-line no-dupe-class-members
  public setVec3(value: vec3 | [number, number, number], normalize = false): void {
    if (normalize) {
      vec3.normalize(tempVec3, value);
      this.data.set(tempVec3, this.offset);
    } else {
      this.data.set(value, this.offset);
    }
    this.offset += 4;
  }

  public setVec4(value: vec4): void;

  // eslint-disable-next-line no-dupe-class-members
  public setVec4(value: [number, number, number, number]): void;

  // eslint-disable-next-line no-dupe-class-members
  public setVec4(value: vec4 | [number, number, number, number]): void {
    this.data.set(value, this.offset);
    this.offset += 4;
  }

  public setMat3(value: mat3): void {
    copyMat3ToBuffer(value, this.data, this.offset);
    this.offset += 12;
  }

  public setMat4(value: mat4): void {
    this.data.set(value, this.offset);
    this.offset += 16;
  }

  public setValue(v0: number, v1: number, v2: number, v3 = 0, normalize = false): void {
    if (normalize) {
      vec3.set(tempVec3, v0, v1, v2);
      vec3.normalize(tempVec3, tempVec3);
      vec4.set(tempVec4, tempVec3[0], tempVec3[1], tempVec3[2], v3);
    } else {
      vec4.set(tempVec4, v0, v1, v2, v3);
    }
    this.data.set(tempVec4, this.offset);
    this.offset += 4;
  }

  public setData(data: ArrayLike<number>): void {
    this.data.set(data);
    this.update();
  }

  public update(): void {
    updateBufferData(this.device, this.buffer, this.data);
    this.offset = 0;
  }

  public destroy(): void {
    this.buffer.destroy();
  }
}
