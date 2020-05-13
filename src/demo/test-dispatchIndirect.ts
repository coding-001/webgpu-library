import { GUI } from 'dat.gui';
import {
  LiteApp,
  ComputePipeline,
} from '../index';

const COMPUTE_SHADER_OUT = `
layout (local_size_x = 1, local_size_y = 1) in;

layout(set = 0, binding = 0) buffer OutputBuffer {
  uint[] b_output;
};

void main() {
  b_output[0] = 10;
  b_output[1] = 20;
  b_output[2] = 30;
}
`;

const COMPUTE_SHADER_IN = `
layout (local_size_x = 1, local_size_y = 1) in;

layout(set = 0, binding = 0) buffer OutputBuffer {
  uint b_output;
};

void main() {
  atomicAdd(b_output, 1);
}
`;

class TestNumWorkGroups extends LiteApp {
  private pipelineOut: ComputePipeline;

  private pipelineIn: ComputePipeline;

  private indirectBuffer: GPUBuffer;

  private outputBuffer: GPUBuffer;

  private emptyBuffer: GPUBuffer;

  private debugIndirectBuffer: GPUBuffer;

  private debugOutputBuffer: GPUBuffer;

  private ready = false;

  private done = false;

  public async onInit(device: GPUDevice): Promise<void> {
    this.indirectBuffer = device.createBuffer({
      size: 4 * 3,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE,
    });
    this.outputBuffer = device.createBuffer({
      size: 4,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    this.emptyBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.COPY_SRC,
    });
    this.debugIndirectBuffer = device.createBuffer({
      size: 4 * 3,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.debugOutputBuffer = device.createBuffer({
      size: 4,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.pipelineOut = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER_OUT,
    });
    this.pipelineOut.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.indirectBuffer,
        },
      },
    ]);
    this.pipelineIn = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER_IN,
    });
    this.pipelineIn.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.outputBuffer,
        },
      },
    ]);
    const gui = new GUI();
    gui.add(this, 'reset');
  }

  public reset(): void {
    this.ready = false;
    this.done = false;
  }

  public onRender(): void {
    if (!this.ready) {
      this.ready = true;

      this.commandEncoder.copyBufferToBuffer(
        this.emptyBuffer,
        0,
        this.outputBuffer,
        0,
        4,
      );

      {
        const passEncoder = this.commandEncoder.beginComputePass();
        this.pipelineOut.bind(passEncoder);
        passEncoder.setBindGroup(0, this.pipelineOut.getBindGroup(0));
        passEncoder.dispatch(1, 1, 1);
        passEncoder.endPass();
      }
      {
        const passEncoder = this.commandEncoder.beginComputePass();
        this.pipelineIn.bind(passEncoder);
        passEncoder.setBindGroup(0, this.pipelineIn.getBindGroup(0));
        passEncoder.dispatchIndirect(this.indirectBuffer, 0);
        passEncoder.endPass();
      }

      this.commandEncoder.copyBufferToBuffer(
        this.indirectBuffer,
        0,
        this.debugIndirectBuffer,
        0,
        4 * 3,
      );
      this.commandEncoder.copyBufferToBuffer(
        this.outputBuffer,
        0,
        this.debugOutputBuffer,
        0,
        4,
      );
    } else if (!this.done) {
      this.done = true;
      (async (): Promise<void> => {
        const arrayIndirect = new Uint32Array(await this.debugIndirectBuffer.mapReadAsync());
        const arrayOutput = new Uint32Array(await this.debugOutputBuffer.mapReadAsync());
        // eslint-disable-next-line no-console
        console.log(arrayIndirect, arrayOutput);
        this.debugIndirectBuffer.unmap();
        this.debugOutputBuffer.unmap();
      })();
    }
  }
}

(async (): Promise<void> => {
  const demo = new TestNumWorkGroups();
  await demo.init();
})();
