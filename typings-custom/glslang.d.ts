export {};

declare global {
  export type ShaderStage = 'vertex' | 'fragment' | 'compute';

  export interface ResultZeroCopy {
    readonly data: Uint32Array;
    free(): void;
  }

  export interface Glslang {
    compileGLSLZeroCopy(glsl: string, shader_stage: ShaderStage, gen_debug: boolean): ResultZeroCopy;
    compileGLSL(glsl: string, shader_type: ShaderStage, gen_debug: boolean): Uint32Array;
  }
}
