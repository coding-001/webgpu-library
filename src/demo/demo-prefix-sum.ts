import {
  AnimationFrame,
  initGlslang,
  ComputePipeline,
  KeyDefine,
} from '../index';

// https://github.com/openglsuperbible/sb7code/blob/master/src/prefixsum/prefixsum.cpp

const COMPUTE_SHADER = `
layout (local_size_x = WORKGROUP_SIZE) in;

layout(set = 0, binding = 0) readonly buffer InputBuffer {
  float[] b_input;
};

layout(set = 0, binding = 1) writeonly buffer OutputBuffer {
  float[] b_output;
};

shared float shared_data[WORKGROUP_SIZE * 2];

void main() {
  uint id = gl_LocalInvocationID.x;
  uint rd_id;
  uint wr_id;
  uint mask;

  const uint steps = uint(log2(WORKGROUP_SIZE)) + 1;
  uint step = 0;

  shared_data[id * 2] = b_input[id * 2];
  shared_data[id * 2 + 1] = b_input[id * 2 + 1];

  barrier();

  for (step = 0; step < steps; step++) {
    mask = (1 << step) - 1;
    rd_id = ((id >> step) << (step + 1)) + mask;
    wr_id = rd_id + 1 + (id & mask);

    shared_data[wr_id] += shared_data[rd_id];

    barrier();
  }

  b_output[id * 2] = shared_data[id * 2];
  b_output[id * 2 + 1] = shared_data[id * 2 + 1];
}
`;

const WORKGROUP_SIZE = 512;
const NUM_ELEMENTS = 1024;

class PrefixSumDemo {
  protected device: GPUDevice;

  protected commandEncoder: GPUCommandEncoder;

  protected time: number;

  private animationFrame: AnimationFrame;

  private pipeline: ComputePipeline;

  private inputArrayBuffer = new Float32Array(NUM_ELEMENTS);

  private outputArrayBuffer = new Float32Array(NUM_ELEMENTS);

  private inputBuffer: GPUBuffer;

  private outputBuffer: GPUBuffer;

  private debugBuffer: GPUBuffer;

  private done = false;

  public async init(): Promise<void> {
    await initGlslang();
    const adapter: GPUAdapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    this.device = device;

    this.animationFrame = new AnimationFrame(this.render.bind(this), 0, true);
    this.initData();
    const buffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(this.inputArrayBuffer);
    buffer.unmap();
    this.inputBuffer = buffer;
    this.outputBuffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    this.debugBuffer = device.createBuffer({
      size: 4 * NUM_ELEMENTS,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const bindGroupLayouts: GPUBindGroupLayout[] = [];
    bindGroupLayouts.push(device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          type: 'readonly-storage-buffer',
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 1,
          type: 'storage-buffer',
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    }));
    this.pipeline = new ComputePipeline({
      device,
      computeShader: COMPUTE_SHADER,
      defines: [
        new KeyDefine('WORKGROUP_SIZE', WORKGROUP_SIZE),
      ],
      bindGroupLayouts,
    });
    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.inputBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.outputBuffer,
        },
      },
    ]);
    this.animationFrame.start();
  }

  public render(time: number): void {
    this.time = time;
    this.commandEncoder = this.device.createCommandEncoder();
    this.onRender();
    this.device.defaultQueue.submit([this.commandEncoder.finish()]);
    this.onAfterRender();
  }

  private initData(): void {
    let total = 0;
    for (let i = 0; i < NUM_ELEMENTS; i += 1) {
      this.inputArrayBuffer[i] = Math.floor(Math.random() * 1000);
      total += this.inputArrayBuffer[i];
      this.outputArrayBuffer[i] = total;
    }
  }

  public onRender(): void {
    if (!this.done) {
      const passEncoder = this.commandEncoder.beginComputePass();
      this.pipeline.bind(passEncoder);
      passEncoder.setBindGroup(0, this.pipeline.getBindGroup(0));
      passEncoder.dispatch(
        1,
      );
      passEncoder.endPass();

      this.commandEncoder.copyBufferToBuffer(
        this.outputBuffer,
        0,
        this.debugBuffer,
        0,
        4 * NUM_ELEMENTS,
      );
    }
  }

  public onAfterRender(): void {
    if (!this.done) {
      this.done = true;
      (async (): Promise<void> => {
        await this.debugBuffer.mapAsync(GPUMapMode.READ);
        const array = new Float32Array(this.debugBuffer.getMappedRange());
        const arrayLength = array.filter((value, i) => value === this.outputArrayBuffer[i]).length;
        // eslint-disable-next-line no-console
        console.log(arrayLength === array.length);
        this.debugBuffer.unmap();
      })();
    }
  }
}

(async (): Promise<void> => {
  const demo = new PrefixSumDemo();
  await demo.init();
})();
