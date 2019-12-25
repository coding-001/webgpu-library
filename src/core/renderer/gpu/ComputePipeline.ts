import KeyDefine from '../KeyDefine';
import Pipeline, {
  buildShaderSource, compileGLSL, logShaderError, PipelineDescriptor,
} from './Pipeline';

export interface ComputePipelineDescriptor extends PipelineDescriptor {
  computeShader: string;
  defines?: (string | KeyDefine)[];
}

export default class ComputePipeline extends Pipeline {
  public constructor(options: ComputePipelineDescriptor) {
    const {
      computeShader, defines, bindGroupLayouts,
    } = options;
    super(options);
    const shaderSource = buildShaderSource(computeShader, defines);

    let computeShaderModule;
    try {
      computeShaderModule = compileGLSL(shaderSource, 'compute');
    } catch (e) {
      logShaderError(e, shaderSource);
    }
    if (!computeShaderModule) {
      return;
    }

    this.pipeline = this.device.createComputePipeline({
      layout: bindGroupLayouts ? this.device.createPipelineLayout({
        bindGroupLayouts,
      }) : undefined,
      computeStage: {
        module: this.device.createShaderModule({
          code: computeShaderModule.data,
        }),
        entryPoint: 'main',
      },
    });
    computeShaderModule.free();
  }
}
