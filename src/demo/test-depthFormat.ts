import { vec3, vec4, mat4 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import {
  LiteApp,
  RenderPipeline,
  UniformBuffer,
  createCubeVao,
  VertexArrayState,
} from '../index';

const VERTEX_SHADER = `
layout(set = 0, binding = 0) uniform UniformScene {
  mat4 u_projectionViewMatrix;
};

layout(set = 1, binding = 0) uniform UniformData {
  mat4 u_modelMatrix;
  vec4 u_diffuseColor;
};

layout(location = 0) in vec4 a_position;

void main () {
  gl_Position = u_projectionViewMatrix * u_modelMatrix * a_position;
}
`;

const FRAGMENT_SHADER = `
layout(set = 1, binding = 0) uniform UniformData {
  mat4 u_modelMatrix;
  vec4 u_diffuseColor;
};

layout(location = 0) out vec4 fragColor;

void main () {
  fragColor = u_diffuseColor;
}
`;

class TestDepthFormat extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  private sceneBuffer: UniformBuffer;

  private depthTexture: GPUTexture;

  private sceneBufferDirty = true;

  private cubeVaoState: VertexArrayState;

  private cubes: GPUBindGroup[] = [];

  private depthFormat: GPUTextureFormat = 'depth24plus-stencil8';

  public async onInit(device: GPUDevice): Promise<void> {
    this.sceneBuffer = new UniformBuffer(device, 16);
    const cubeVao = createCubeVao();
    this.cubeVaoState = new VertexArrayState(device, cubeVao);
    this.changeDepthFormat(this.depthFormat);
    this.camera.on('change', () => {
      this.sceneBufferDirty = true;
    });
    const gui = new GUI();
    gui.add(this, 'depthFormat', [
      'depth24plus-stencil8',
      'depth24plus',
      'depth32float',
    ]).onChange(() => {
      this.changeDepthFormat(this.depthFormat);
    });
  }

  private changeDepthFormat(depthFormat: GPUTextureFormat): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    this.pipeline = new RenderPipeline({
      device: this.device,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      vertexState: this.cubeVaoState.vertexState,
      depthFormat,
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
      format: depthFormat,
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
    this.cubeVaoState.bind(passEncoder);

    this.cubes.forEach((cube) => {
      passEncoder.setBindGroup(1, cube);
      this.cubeVaoState.draw(passEncoder);
    });

    passEncoder.endPass();
  }

  public addCube(position: vec3, color: vec4): void {
    const modelMatrix = mat4.create();
    mat4.fromTranslation(modelMatrix, position);
    const dataBuffer = new UniformBuffer(this.device, 16 + 4);

    dataBuffer.setMat4(modelMatrix);
    dataBuffer.setVec4(color);
    dataBuffer.update();

    this.cubes.push(this.pipeline.createBindGroup(1, [
      {
        binding: 0,
        resource: {
          buffer: dataBuffer.buffer,
        },
      },
    ]));
  }
}

(async (): Promise<void> => {
  const demo = new TestDepthFormat();
  await demo.init();

  demo.addCube(vec3.fromValues(-2, 0, 0), vec4.fromValues(0.0, 0.48, 0.73, 1.0));
  demo.addCube(vec3.fromValues(2, 0, 0), vec4.fromValues(0, 0.43, 0.33, 1));
})();
