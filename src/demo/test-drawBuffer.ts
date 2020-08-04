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
  // vec2 uv = v_uv;
  vec2 uv = vec2(gl_FragCoord.x / SCREEN_WIDTH, gl_FragCoord.y / SCREEN_HEIGHT);
  uint index = uint(uv.y * TEXTURE_HEIGHT) * TEXTURE_WIDTH + uint(uv.x * TEXTURE_WIDTH);
  fragColor = b_output[index];
}
`;

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 1024;

class TestDemo extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  public async onInit(device: GPUDevice): Promise<void> {
    this.pipeline = new RenderPipeline({
      device: this.device,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depth: false,
      defines: [
        new KeyDefine('SCREEN_WIDTH', this.canvas.width),
        new KeyDefine('SCREEN_HEIGHT', this.canvas.height),
        new KeyDefine('TEXTURE_WIDTH', TEXTURE_WIDTH),
        new KeyDefine('TEXTURE_HEIGHT', TEXTURE_HEIGHT),
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

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    const buffer = device.createBuffer({
      size: 4 * 4 * TEXTURE_WIDTH * TEXTURE_HEIGHT,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    const floatArrayBuffer = new Float32Array(buffer.getMappedRange());
    for (let i = 0, count = 4 * TEXTURE_WIDTH * TEXTURE_HEIGHT; i < count; i += 4) {
      floatArrayBuffer[i] = imageData.data[i] / 255;
      floatArrayBuffer[i + 1] = imageData.data[i + 1] / 255;
      floatArrayBuffer[i + 2] = imageData.data[i + 2] / 255;
      floatArrayBuffer[i + 3] = imageData.data[i + 3] / 255;
    }
    buffer.unmap();

    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer,
        },
      },
    ]);
  }

  public onRender(): void {
    this.renderPassDescriptor.colorAttachments[0].attachment = this.textureView;
    const passEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
    this.pipeline.bind(passEncoder);
    passEncoder.setBindGroup(0, this.pipeline.getBindGroup(0));
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.endPass();
  }
}

(async (): Promise<void> => {
  const demo = new TestDemo();
  await demo.init();
})();
