import KeyDefine from '../KeyDefine';
import Pipeline, {
  buildShaderSource, compileGLSL, logShaderError, PipelineDescriptor,
} from './Pipeline';

export interface RenderPipelineDescriptor extends PipelineDescriptor {
  vertexShader: string;
  fragmentShader: string;
  defines?: (string | KeyDefine)[];
  primitiveTopology?: GPUPrimitiveTopology;
  vertexState?: GPUVertexStateDescriptor;
  enableMSAA?: boolean;
  depthWriteEnabled?: boolean;
  blend?: boolean;
  alphaBlend?: GPUBlendDescriptor;
  colorBlend?: GPUBlendDescriptor;
  colorFormat?: GPUTextureFormat | GPUTextureFormat[];
  cullMode?: GPUCullMode;
  depth?: boolean;
  depthCompare?: GPUCompareFunction;
  stencilFront?: GPUStencilStateFaceDescriptor;
  stencilBack?: GPUStencilStateFaceDescriptor;
  stencilReadMask?: number;
  stencilWriteMask?: number;
  writeMask?: GPUColorWriteFlags;
  depthFormat?: GPUTextureFormat;
}

export default class RenderPipeline extends Pipeline {
  private _enableMSAA: boolean;

  private pipelineDescriptor: GPURenderPipelineDescriptor;

  public constructor(options: RenderPipelineDescriptor) {
    const {
      vertexShader, fragmentShader, vertexState, defines,
      bindGroupLayouts, alphaBlend, colorBlend,
      colorFormat = 'bgra8unorm',
      primitiveTopology = 'triangle-list',
      depthWriteEnabled = true,
      cullMode = 'none',
      blend = false,
      enableMSAA = false,
      depth = true,
      depthFormat = 'depth24plus-stencil8',
      depthCompare = 'less-equal',
      stencilReadMask = 0xFFFFFFFF,
      stencilWriteMask = 0xFFFFFFFF,
      writeMask = 0xF,
      stencilBack = {
        compare: 'always',
        failOp: 'keep',
        depthFailOp: 'keep',
        passOp: 'keep',
      } as GPUStencilStateFaceDescriptor,
      stencilFront = {
        compare: 'always',
        failOp: 'keep',
        depthFailOp: 'keep',
        passOp: 'keep',
      } as GPUStencilStateFaceDescriptor,
    } = options;
    super(options);
    this._enableMSAA = enableMSAA;
    const colorFormats: GPUTextureFormat[] = Array.isArray(colorFormat) ? colorFormat
      : [colorFormat];
    const colorStates: GPUColorStateDescriptor[] = colorFormats.map((format) => {
      const result: GPUColorStateDescriptor = {
        alphaBlend: alphaBlend || {
          srcFactor: 'one', // 'zero', 'one', 'src-color', 'one-minus-src-color', 'src-alpha', 'one-minus-src-alpha', 'dst-color', 'one-minus-dst-color', 'dst-alpha', 'one-minus-dst-alpha', 'src-alpha-saturated', 'blend-color', 'one-minus-blend-color'
          dstFactor: blend ? 'one-minus-src-alpha' : 'zero',
          operation: 'add', // 'add', 'subtract', 'reverse-subtract', 'min', 'max'
        },
        colorBlend: colorBlend || {
          srcFactor: blend ? 'src-alpha' : 'one',
          dstFactor: blend ? 'one-minus-src-alpha' : 'zero',
          operation: 'add',
        },
        format,
        writeMask,
      };
      return result;
    });
    const vertexShaderSource = buildShaderSource(vertexShader, defines);
    const fragmentShaderSource = buildShaderSource(fragmentShader, defines);

    let vertexShaderCode;
    try {
      vertexShaderCode = compileGLSL(vertexShaderSource, 'vertex');
    } catch (e) {
      logShaderError(e, vertexShaderSource);
      return;
    }
    let fragmentShaderCode;
    try {
      if (fragmentShaderSource) {
        fragmentShaderCode = compileGLSL(fragmentShaderSource, 'fragment');
      }
    } catch (e) {
      logShaderError(e, fragmentShaderSource);
      return;
    }
    this.pipelineDescriptor = {
      layout: bindGroupLayouts ? this.device.createPipelineLayout({
        bindGroupLayouts,
      }) : undefined,
      vertexStage: {
        module: this.device.createShaderModule({
          code: vertexShaderCode.data,
        }),
        entryPoint: 'main',
      },
      fragmentStage: fragmentShaderCode ? {
        module: this.device.createShaderModule({
          code: fragmentShaderCode.data,
        }),
        entryPoint: 'main',
      } : undefined,
      primitiveTopology,
      rasterizationState: {
        cullMode,
        // depthBias: 0,
        // depthBiasClamp: 0,
        // depthBiasSlopeScale: 0,
        frontFace: 'ccw',
      },
      depthStencilState: depth ? {
        format: depthFormat,
        depthWriteEnabled,
        depthCompare,
        stencilBack,
        stencilFront,
        stencilReadMask,
        stencilWriteMask,
      } : undefined,
      vertexState,
      colorStates,
      sampleCount: 1,
    };

    vertexShaderCode.free();
    if (fragmentShaderCode) {
      fragmentShaderCode.free();
    }

    this.create();
  }

  private create(): void {
    this.pipelineDescriptor.sampleCount = this._enableMSAA ? 4 : 1;
    this.pipeline = this.device.createRenderPipeline(this.pipelineDescriptor);
  }

  public get enableMSAA(): boolean {
    return this._enableMSAA;
  }

  public set enableMSAA(value: boolean) {
    if (this._enableMSAA === value) {
      return;
    }
    this._enableMSAA = value;
    this.create();
  }
}
