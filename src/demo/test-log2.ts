import {
  LiteApp,
  ComputePipeline,
} from '../index';

const COMPUTE_SHADER = `
layout (local_size_x = 1, local_size_y = 1) in;

layout(set = 0, binding = 0) buffer OutputBufferFloat {
  float[] b_outputFloat;
};

layout(set = 0, binding = 1) buffer OutputBufferUint {
  uint[] b_outputUint;
};

void main() {
  b_outputFloat[0] = log2(1);
  b_outputUint[0] = uint(log2(1));

  b_outputFloat[1] = log2(2);
  b_outputUint[1] = uint(log2(2));

  b_outputFloat[2] = log2(4);
  b_outputUint[2] = uint(log2(4));

  b_outputFloat[3] = log2(8);
  b_outputUint[3] = uint(log2(8));

  b_outputFloat[4] = log2(16);
  b_outputUint[4] = uint(log2(16));

  b_outputFloat[5] = log2(32);
  b_outputUint[5] = uint(log2(32));

  b_outputFloat[6] = log2(64);
  b_outputUint[6] = uint(log2(64));

  b_outputFloat[7] = log2(128);
  b_outputUint[7] = uint(log2(128));

  b_outputFloat[8] = log2(256);
  b_outputUint[8] = uint(log2(256));

  b_outputFloat[9] = log2(512);
  b_outputUint[9] = uint(log2(512));

  b_outputFloat[10] = log2(1024);
  b_outputUint[10] = uint(log2(1024));
}
`;

class TestLog2 extends LiteApp {
  private pipeline: ComputePipeline;

  private outputFloatBuffer: GPUBuffer;

  private outputUintBuffer: GPUBuffer;

  private debugFloatBuffer: GPUBuffer;

  private debugUintBuffer: GPUBuffer;

  private ready = false;

  private done = false;

  private size = 11;

  public async onInit(device: GPUDevice): Promise<void> {
    this.outputFloatBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.debugFloatBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.outputUintBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.debugUintBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.pipeline = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER,
    });
    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.outputFloatBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.outputUintBuffer,
        },
      },
    ]);
  }

  public onRender(): void {
    if (!this.ready) {
      this.ready = true;
      const passEncoder = this.commandEncoder.beginComputePass();
      this.pipeline.bind(passEncoder);
      passEncoder.setBindGroup(0, this.pipeline.getBindGroup(0));
      passEncoder.dispatch(1);
      passEncoder.endPass();

      this.commandEncoder.copyBufferToBuffer(
        this.outputFloatBuffer,
        0,
        this.debugFloatBuffer,
        0,
        4 * this.size,
      );
      this.commandEncoder.copyBufferToBuffer(
        this.outputUintBuffer,
        0,
        this.debugUintBuffer,
        0,
        4 * this.size,
      );
    } else if (!this.done) {
      this.done = true;
      (async (): Promise<void> => {
        {
          const array = new Float32Array(await this.debugFloatBuffer.mapReadAsync());
          // eslint-disable-next-line no-console
          console.log(array);
          this.debugFloatBuffer.unmap();
        }
        {
          const array = new Uint32Array(await this.debugUintBuffer.mapReadAsync());
          // eslint-disable-next-line no-console
          console.log(array);
          this.debugUintBuffer.unmap();
        }
      })();
    }
  }
}

(async (): Promise<void> => {
  const demo = new TestLog2();
  await demo.init();
})();
