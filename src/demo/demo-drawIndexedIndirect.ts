import { vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import {
  LiteApp,
  RenderPipeline,
  UniformBuffer,
  VertexArrayState,
  VertexArray,
} from '../index';

// https://cs.chromium.org/chromium/src/third_party/dawn/src/tests/end2end/DrawIndexedIndirectTests.cpp

const VERTEX_SHADER = `
layout(set = 0, binding = 0) uniform UniformScene {
  mat4 u_projectionViewMatrix;
};

layout(location = 0) in vec4 a_position;

void main () {
  gl_Position = u_projectionViewMatrix * a_position;
}
`;

const FRAGMENT_SHADER = `
layout(location = 0) out vec4 fragColor;

void main () {
  fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`;

class DrawIndexedIndirectDemo extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  private sceneBuffer: UniformBuffer;

  private depthTexture: GPUTexture;

  private sceneBufferDirty = true;

  private planeVaoState: VertexArrayState;

  private indirectBuffer: GPUBuffer;

  private show = 'all';

  public constructor() {
    super();
    this.camera.position = vec3.fromValues(0, 0, 3);
  }

  public async onInit(device: GPUDevice): Promise<void> {
    this.sceneBuffer = new UniformBuffer(device, 16);
    const planeVao = new VertexArray({
      buffers: [
        {
          arrayStride: 4 * 4,
          attributes: [
            {
              name: 'position',
              format: 'float4',
            },
          ],
          data: new Float32Array([
            // First quad: the first 3 vertices represent the bottom left triangle
            -1.0, 1.0, 0.0, 1.0, 1.0, -1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,
            // Second quad: the first 3 vertices represent the top right triangle
            -1.0, 1.0, 0.0, 1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 1.0,
          ]),
        },
      ],
      indexBuffer: new Uint16Array([
        0, 1, 2, 0, 3, 1,
      ]),
      count: 6,
      mode: 'TRIANGLE_STRIP',
    });
    this.planeVaoState = new VertexArrayState(device, planeVao);
    this.indirectBuffer = device.createBuffer({
      size: 4 * 5,
      // eslint-disable-next-line no-bitwise
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT,
    });
    this.update();
    this.pipeline = new RenderPipeline({
      device: this.device,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      vertexState: this.planeVaoState.vertexState,
      depthFormat: 'depth24plus-stencil8',
    });
    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.sceneBuffer.buffer,
        },
      },
    ]);

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
        depth: 1,
      },
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.OUTPUT_ATTACHMENT,
    });
    this.renderPassDescriptor = {
      colorAttachments: [
        {
          attachment: undefined,
          loadValue: [0, 0, 0, 0],
        },
      ],
      depthStencilAttachment: {
        attachment: this.depthTexture.createView(),
        depthLoadValue: 1.0,
        depthStoreOp: 'store',
        stencilLoadValue: 0,
        stencilStoreOp: 'store',
      },
    };
    this.camera.on('change', () => {
      this.sceneBufferDirty = true;
    });
    const gui = new GUI();
    gui.add(this, 'show', ['all', 'bottom-left', 'top-right', 'none']).onChange(() => {
      this.update();
    });
  }

  private update(): void {
    switch (this.show) {
      case 'all':
        this.indirectBuffer.setSubData(0, new Uint32Array([6, 1, 0, 0, 0]));
        break;
      case 'bottom-left':
        this.indirectBuffer.setSubData(0, new Uint32Array([3, 1, 0, 0, 0]));
        break;
      case 'top-right':
        this.indirectBuffer.setSubData(0, new Uint32Array([3, 1, 3, 0, 0]));
        break;
      case 'none':
        this.indirectBuffer.setSubData(0, new Uint32Array([0, 0, 0, 0, 0]));
        break;
      default:
        break;
    }
  }

  private updateSceneBuffer(): void {
    if (this.sceneBufferDirty) {
      this.sceneBufferDirty = false;
      this.sceneBuffer.setMat4(this.camera.projectionViewMatrix);
      this.sceneBuffer.update();
    }
  }

  public onRender(): void {
    this.updateSceneBuffer();

    this.renderPassDescriptor.colorAttachments[0].attachment = this.textureView;
    const passEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);

    this.pipeline.bind(passEncoder);
    passEncoder.setBindGroup(0, this.pipeline.getBindGroup(0));
    this.planeVaoState.bind(passEncoder);
    passEncoder.drawIndexedIndirect(this.indirectBuffer, 0);

    passEncoder.endPass();
  }
}

(async (): Promise<void> => {
  const demo = new DrawIndexedIndirectDemo();
  await demo.init();
})();
