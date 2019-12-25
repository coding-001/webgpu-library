import DataBuffer from './DataBuffer';

export default class UniformBuffer extends DataBuffer {
  constructor(device: GPUDevice, size: number, usage = GPUBufferUsage.COPY_DST) {
    // eslint-disable-next-line no-bitwise
    super(device, size, GPUBufferUsage.UNIFORM | usage);
  }
}
