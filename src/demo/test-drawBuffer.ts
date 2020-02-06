import { GUI } from 'dat.gui';
import {
  LiteApp,
  RenderPipeline,
  KeyDefine,
} from '../index';

const VERTEX_SHADER = `
layout(location = 0) out vec2 v_uv;

void main () {
  v_uv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
  gl_Position = vec4(v_uv * 2.0 - 1.0, 0.0, 1.0);
  v_uv.y = 1.0 - v_uv.y;
}
`;

const FRAGMENT_SHADER = `
layout(set = 0, binding = 0) buffer OutputBuffer {
  vec4[] b_output;
};

layout(location = 0) in vec2 v_uv;

layout(location = 0) out vec4 fragColor;

void main () {
  uint index = uint(gl_FragCoord.y * 1024) + uint(gl_FragCoord.x);
  fragColor = b_output[index];
}
`;

const NUM_ELEMENTS = 1024;

class TestDemo extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  private bindGroups: GPUBindGroup[] = [];

  private fix = false;

  public constructor() {
    super({
      width: 512,
      height: 512,
    });

    const gui = new GUI();
    gui.add(this, 'fix');
  }

  public async onInit(device: GPUDevice): Promise<void> {
    this.pipeline = new RenderPipeline({
      device: this.device,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depth: false,
      defines: [
        new KeyDefine('WIDTH', this.canvas.width),
        new KeyDefine('HEIGHT', this.canvas.height),
      ],
    });

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          attachment: undefined,
          loadValue: 'load',
        },
      ],
    };

    const image = new Image();
    image.src = './asset/images/uv-grid.jpg';
    await image.decode();
    const canvas = document.createElement('canvas');
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, -canvas.width / 2, 0, canvas.width, canvas.height);
    ctx.drawImage(image, canvas.width / 2, 0, canvas.width, canvas.height);
    this.addBindGroup(ctx, device);

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    this.addBindGroup(ctx, device);
  }

  private addBindGroup(ctx: CanvasRenderingContext2D, device: GPUDevice): void {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    const [buffer, arrayBuffer] = device.createBufferMapped({
      size: 4 * 4 * NUM_ELEMENTS * NUM_ELEMENTS,
      usage: GPUBufferUsage.STORAGE,
    });
    const floatArrayBuffer = new Float32Array(arrayBuffer);
    for (let i = 0, count = 4 * NUM_ELEMENTS * NUM_ELEMENTS; i < count; i += 4) {
      floatArrayBuffer[i] = imageData.data[i] / 255;
      floatArrayBuffer[i + 1] = imageData.data[i + 1] / 255;
      floatArrayBuffer[i + 2] = imageData.data[i + 2] / 255;
      floatArrayBuffer[i + 3] = imageData.data[i + 3] / 255;
    }
    buffer.unmap();

    this.bindGroups.push(this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer,
        },
      },
    ]));
  }

  public onRender(): void {
    this.renderPassDescriptor.colorAttachments[0].attachment = this.textureView;
    const passEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
    this.pipeline.bind(passEncoder);
    passEncoder.setBindGroup(0, this.bindGroups[this.fix ? 0 : 1]);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.endPass();
  }
}

(async (): Promise<void> => {
  const demo = new TestDemo();
  await demo.init();
})();
