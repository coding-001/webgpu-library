import { vec3 } from 'gl-matrix';
import {
  LiteApp,
  RenderPipeline,
  UniformBuffer,
  VertexArrayState,
  VertexArray,
} from '../index';

const VERTEX_SHADER = `
layout(set = 0, binding = 0) uniform UniformScene {
  mat4 u_projectionViewMatrix;
};

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_offset;

void main () {
  gl_Position = u_projectionViewMatrix * vec4(a_position + a_offset, 1.0);
}
`;

const FRAGMENT_SHADER = `
layout(location = 0) out vec4 fragColor;

void main () {
  fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`;

class DrawIndirectDemo extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  private sceneBuffer: UniformBuffer;

  private depthTexture: GPUTexture;

  private sceneBufferDirty = true;

  private planeVaoState: VertexArrayState;

  private indirectBuffer: GPUBuffer;

  public constructor() {
    super();
    this.camera.position = vec3.fromValues(0, 0, 3);
  }

  public async onInit(device: GPUDevice): Promise<void> {
    this.sceneBuffer = new UniformBuffer(device, 16);
    const planeVao = new VertexArray({
      buffers: [
        {
          arrayStride: 4 * 3,
          attributes: [
            {
              name: 'position',
              format: 'float3',
            },
          ],
          data: new Float32Array([
            0.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,
          ]),
        },
        {
          arrayStride: 4 * 3,
          attributes: [
            {
              name: 'offset',
              format: 'float3',
            },
          ],
          data: new Float32Array([
            -1, 0, 0,
            1, 0, 0,
          ]),
          instanceCount: 2,
        },
      ],
      count: 6,
      mode: 'TRIANGLE_STRIP',
    });
    this.planeVaoState = new VertexArrayState(device, planeVao);
    const buffer = device.createBuffer({
      size: 4 * 4 * 2,
      usage: GPUBufferUsage.INDIRECT,
      mappedAtCreation: true,
    });
    this.indirectBuffer = buffer;
    new Uint32Array(buffer.getMappedRange()).set([
      // vertexCount, instanceCount, firstVertex, firstInstance
      3, 1, 0, 0,
      3, 1, 0, 1,
    ]);
    this.indirectBuffer.unmap();
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
    passEncoder.drawIndirect(this.indirectBuffer, 1);

    passEncoder.endPass();
  }
}

(async (): Promise<void> => {
  const demo = new DrawIndirectDemo();
  await demo.init();
})();
