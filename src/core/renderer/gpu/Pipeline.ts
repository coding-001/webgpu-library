// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import glslangModule from '../../../../docs/js/vendor/glslang';
import KeyDefine from '../KeyDefine';

let glslang: Glslang;

export async function initGlslang(): Promise<void> {
  glslang = await glslangModule();
}

export function compileGLSL(code: string, type: ShaderStage): ResultZeroCopy {
  return glslang.compileGLSLZeroCopy(code, type, true);
}

export function logShaderError(e: Error, source: string): void {
  const formatedSource = source.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
  // TODO
  // eslint-disable-next-line no-console
  console.error(e);
  // eslint-disable-next-line no-console
  console.log(formatedSource);
}

const SHADER_PREFIX = '#version 450\n';

export function buildShaderSource(shaderSource: string, defines?: (string | KeyDefine)[]): string {
  if (!shaderSource) {
    return null;
  }
  let prefix = SHADER_PREFIX;

  if (defines) {
    defines.forEach((define) => {
      if (define instanceof KeyDefine) {
        prefix += `#define ${define.name} ${define.value}\n`;
      } else {
        prefix += `#define ${define}\n`;
      }
    });
  }

  if (shaderSource.startsWith(SHADER_PREFIX)) {
    return prefix + shaderSource.substr(SHADER_PREFIX.length);
  }
  return prefix + shaderSource;
}

export interface PipelineDescriptor {
  device: GPUDevice;
  bindGroupLayouts?: GPUBindGroupLayout[];
}

export default class Pipeline {
  private _device: GPUDevice;

  protected pipeline: GPURenderPipeline | GPUComputePipeline;

  private _bindGroupLayouts: GPUBindGroupLayout[];

  private bindGroups: GPUBindGroup[] = [];

  public constructor(options: PipelineDescriptor) {
    const {
      device, bindGroupLayouts = [],
    } = options;
    this._device = device;
    this._bindGroupLayouts = bindGroupLayouts;
  }

  public get device(): GPUDevice {
    return this._device;
  }

  public get bindGroupLayouts(): GPUBindGroupLayout[] {
    return this._bindGroupLayouts;
  }

  public getBindGroupLayout(index: number): GPUBindGroupLayout {
    let result = this._bindGroupLayouts[index];
    if (!result) {
      result = this.pipeline.getBindGroupLayout(index);
      this._bindGroupLayouts[index] = result;
    }
    return result;
  }

  public createBindGroup(index: number, bindings: GPUBindGroupBinding[]): GPUBindGroup {
    const bindingGroup = this.device.createBindGroup({
      layout: this.getBindGroupLayout(index),
      bindings,
    });
    this.bindGroups[index] = bindingGroup;
    return bindingGroup;
  }

  public getBindGroup(index: number): GPUBindGroup {
    return this.bindGroups[index];
  }
}
