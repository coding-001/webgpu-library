import {
  LiteApp,
  ComputePipeline,
  KeyDefine,
} from '../index';

// https://github.com/openglsuperbible/sb7code/blob/master/src/prefixsum/prefixsum.cpp

const COMPUTE_SHADER = `
layout (local_size_x = WORKGROUP_SIZE) in;

layout(set = 0, binding = 0) /* readonly */ buffer InputBuffer {
  float[] b_input;
};

layout(set = 0, binding = 1) /* writeonly */ buffer OutputBuffer {
  float[] b_output;
};

shared float shared_data[WORKGROUP_SIZE * 2];

void main() {
  uint id = gl_LocalInvocationID.x;
  uint rd_id;
  uint wr_id;
  uint mask;
  ivec2 P0 = ivec2(id * 2, gl_WorkGroupID.x);
  ivec2 P1 = ivec2(id * 2 + 1, gl_WorkGroupID.x);

  // TODO: workaround
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1046622
  float stepsFloat = log2(WORKGROUP_SIZE);
  const uint steps = uint(stepsFloat) + 1;
  uint step = 0;

  shared_data[P0.x] = b_input[P0.x + P0.y * WORKGROUP_SIZE * 2];
  shared_data[P1.x] = b_input[P1.x + P1.y * WORKGROUP_SIZE * 2];

  barrier();

  for (step = 0; step < steps; step++) {
    mask = (1 << step) - 1;
    rd_id = ((id >> step) << (step + 1)) + mask;
    wr_id = rd_id + 1 + (id & mask);

    shared_data[wr_id] += shared_data[rd_id];

    barrier();
  }

  b_output[P0.x * WORKGROUP_SIZE * 2 + P0.y] = shared_data[P0.x];
  b_output[P1.x * WORKGROUP_SIZE * 2 + P1.y] = shared_data[P1.x];
}
`;

const WORKGROUP_SIZE = 8;
const NUM_ELEMENTS = 16;

class PrefixSum2DDemo extends LiteApp {
  private pipeline: ComputePipeline;

  private inputArrayBuffer = new Float32Array(NUM_ELEMENTS * NUM_ELEMENTS);

  private output1ArrayBuffer = new Float32Array(NUM_ELEMENTS * NUM_ELEMENTS);

  private output2ArrayBuffer = new Float32Array(NUM_ELEMENTS * NUM_ELEMENTS);

  private inputBuffer: GPUBuffer;

  private output1Buffer: GPUBuffer;

  private output2Buffer: GPUBuffer;

  private bindGroups: GPUBindGroup[] = [];

  private debugBuffer: GPUBuffer;

  private ready = false;

  private done = false;

  public async onInit(device: GPUDevice): Promise<void> {
    this.initData();
    const [buffer, arrayBuffer] = device.createBufferMapped({
      size: 4 * NUM_ELEMENTS * NUM_ELEMENTS,
      usage: GPUBufferUsage.STORAGE,
    });
    new Float32Array(arrayBuffer).set(this.inputArrayBuffer);
    buffer.unmap();
    this.inputBuffer = buffer;
    this.output1Buffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS * NUM_ELEMENTS,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.output2Buffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS * NUM_ELEMENTS,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.debugBuffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS * NUM_ELEMENTS,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.pipeline = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER,
      defines: [
        new KeyDefine('WORKGROUP_SIZE', WORKGROUP_SIZE),
      ],
    });
    this.bindGroups[0] = this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.inputBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.output1Buffer,
        },
      },
    ]);
    this.bindGroups[1] = this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.output1Buffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.output2Buffer,
        },
      },
    ]);
  }

  private initData(): void {
    for (let i = 0; i < NUM_ELEMENTS; i += 1) {
      for (let j = 0; j < NUM_ELEMENTS; j += 1) {
        const index = j + i * NUM_ELEMENTS;
        this.inputArrayBuffer[index] = Math.floor(Math.random() * 10);
      }
    }
    for (let i = 0; i < NUM_ELEMENTS; i += 1) {
      let total = 0;
      for (let j = 0; j < NUM_ELEMENTS; j += 1) {
        const index = j + i * NUM_ELEMENTS;
        total += this.inputArrayBuffer[index];
        this.output1ArrayBuffer[index] = total;
      }
    }
    for (let i = 0; i < NUM_ELEMENTS; i += 1) {
      let total = 0;
      for (let j = 0; j < NUM_ELEMENTS; j += 1) {
        const index = j * NUM_ELEMENTS + i;
        total += this.output1ArrayBuffer[index];
        this.output2ArrayBuffer[index] = total;
      }
    }
  }

  public onRender(): void {
    if (!this.ready) {
      this.ready = true;
      const passEncoder = this.commandEncoder.beginComputePass();
      this.pipeline.bind(passEncoder);
      passEncoder.setBindGroup(0, this.bindGroups[0]);
      passEncoder.dispatch(
        NUM_ELEMENTS,
      );
      passEncoder.setBindGroup(0, this.bindGroups[1]);
      passEncoder.dispatch(
        NUM_ELEMENTS,
      );
      passEncoder.endPass();

      this.commandEncoder.copyBufferToBuffer(
        this.output2Buffer,
        0,
        this.debugBuffer,
        0,
        4 * NUM_ELEMENTS * NUM_ELEMENTS,
      );
    } else if (!this.done) {
      this.done = true;
      (async (): Promise<void> => {
        const array = new Float32Array(await this.debugBuffer.mapReadAsync());
        const count = array.filter((value, i) => value === this.output2ArrayBuffer[i]).length;
        // eslint-disable-next-line no-console
        console.log(NUM_ELEMENTS * NUM_ELEMENTS === count);
        this.debugBuffer.unmap();
      })();
    }
  }
}

(async (): Promise<void> => {
  const demo = new PrefixSum2DDemo();
  await demo.init();
})();
