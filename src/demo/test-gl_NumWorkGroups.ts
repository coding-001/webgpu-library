import {
  LiteApp,
  ComputePipeline,
  KeyDefine,
} from '../index';

const COMPUTE_SHADER = `
layout (local_size_x = WORKGROUP_SIZE_X, local_size_y = WORKGROUP_SIZE_Y) in;

layout(set = 0, binding = 0) buffer OutputBuffer {
  uint[] b_output;
};

void main() {
  b_output[0] = gl_NumWorkGroups.x;
  b_output[1] = gl_NumWorkGroups.y;
}
`;

const WORKGROUP_SIZE_X = 16;
const WORKGROUP_SIZE_Y = 16;
const NUM_WORKGROUPS_X = 2;
const NUM_WORKGROUPS_Y = 3;

class TestNumWorkGroups extends LiteApp {
  private pipeline: ComputePipeline;

  private outputBuffer: GPUBuffer;

  private debugBuffer: GPUBuffer;

  private size = 2;

  private ready = false;

  private done = false;

  public async onInit(device: GPUDevice): Promise<void> {
    this.outputBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.debugBuffer = device.createBuffer({
      size: 4 * this.size,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.pipeline = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER,
      defines: [
        new KeyDefine('WORKGROUP_SIZE_X', WORKGROUP_SIZE_X),
        new KeyDefine('WORKGROUP_SIZE_Y', WORKGROUP_SIZE_Y),
      ],
    });
    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.outputBuffer,
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
      passEncoder.dispatch(
        NUM_WORKGROUPS_X, NUM_WORKGROUPS_Y,
      );
      passEncoder.endPass();

      this.commandEncoder.copyBufferToBuffer(
        this.outputBuffer,
        0,
        this.debugBuffer,
        0,
        4 * this.size,
      );
    } else if (!this.done) {
      this.done = true;
      (async (): Promise<void> => {
        const array = new Uint32Array(await this.debugBuffer.mapReadAsync());
        this.debugBuffer.unmap();
        // eslint-disable-next-line no-console
        console.log(array);
      })();
    }
  }
}

(async (): Promise<void> => {
  const demo = new TestNumWorkGroups();
  await demo.init();
})();
