import { vec3, vec4, mat4 } from 'gl-matrix';
import {
  LiteApp,
  RenderPipeline,
  UniformBuffer,
  createCubeVao,
  VertexArrayState,
  StorageBuffer,
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
layout(set = 0, binding = 0) uniform UniformScene {
  mat4 u_projectionViewMatrix;
};

struct PointLight {
  vec4 color;
};

layout(set = 0, binding = 1) buffer LightBuffer {
  PointLight b_lights[];
};

layout(set = 1, binding = 0) uniform UniformData {
  mat4 u_modelMatrix;
  vec4 u_diffuseColor;
};

layout(location = 0) out vec4 fragColor;

void main () {
  fragColor = vec4(b_lights[0].color.rgb, 1.0);
}
`;

const MAX_LIGHT_COUNT = 2;

class TestStorageBuffer extends LiteApp {
  private pipeline: RenderPipeline;

  private renderPassDescriptor: GPURenderPassDescriptor;

  private sceneBuffer: UniformBuffer;

  private lightBuffer: StorageBuffer;

  private depthTexture: GPUTexture;

  private sceneBufferDirty = true;

  private cubeVaoState: VertexArrayState;

  private cubes: GPUBindGroup[] = [];

  private lights: { color: vec3; position: vec3; range: number }[] = [];

  private lightBufferDirty = true;

  public async onInit(device: GPUDevice): Promise<void> {
    this.sceneBuffer = new UniformBuffer(device, 16);
    this.lightBuffer = new StorageBuffer(device, MAX_LIGHT_COUNT * 4);
    const cubeVao = createCubeVao();
    this.cubeVaoState = new VertexArrayState(device, cubeVao);
    this.pipeline = new RenderPipeline({
      device: this.device,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      vertexState: this.cubeVaoState.vertexState,
    });
    this.pipeline.createBindGroup(0, [
      {
        binding: 0,
        resource: {
          buffer: this.sceneBuffer.buffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.lightBuffer.buffer,
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
          loadValue: [0, 0, 0, 1],
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

  private updateLightBuffer(): void {
    if (this.lightBufferDirty) {
      this.lightBufferDirty = false;
      this.lights.forEach((light) => {
        this.lightBuffer.setVec3(light.color);
      });
      this.lightBuffer.update();
    }
  }

  public onRender(): void {
    this.updateSceneBuffer();
    this.updateLightBuffer();

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

  public addLight(color: vec3, position: vec3, range: number): void {
    this.lightBufferDirty = true;
    this.lights.push({
      color,
      position,
      range,
    });
  }
}

(async (): Promise<void> => {
  const demo = new TestStorageBuffer();
  await demo.init();

  demo.addCube(vec3.fromValues(-2, 0, 0), vec4.fromValues(0.0, 0.48, 0.73, 1.0));
  demo.addCube(vec3.fromValues(2, 0, 0), vec4.fromValues(0, 0.43, 0.33, 1));

  demo.addLight(vec3.fromValues(1, 1, 1), vec3.fromValues(0, 2, 0), 10);
})();
