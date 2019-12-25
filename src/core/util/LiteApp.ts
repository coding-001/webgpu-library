import AnimationFrame from '../AnimationFrame';
import Camera from '../Camera';
import { initGlslang } from '../renderer/gpu/Pipeline';

export default abstract class LiteApp {
  protected canvas: HTMLCanvasElement;

  private context: GPUCanvasContext;

  private swapChain: GPUSwapChain;

  protected device: GPUDevice;

  protected camera: Camera;

  protected textureView: GPUTextureView;

  protected commandEncoder: GPUCommandEncoder;

  protected time: number;

  private animationFrame: AnimationFrame;

  public constructor(options: {
    width?: number;
    height?: number;
  } = {}) {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const {
      width = window.innerWidth,
      height = window.innerHeight,
    } = options;
    const { devicePixelRatio = 1 } = window;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.canvas = canvas;
    this.camera = new Camera({
      position: [0, 10, 10],
      aspect: canvas.width / canvas.height,
    });
    this.camera.attach(canvas);
    this.animationFrame = new AnimationFrame(this.render.bind(this), 0, true);
  }

  public async init(): Promise<void> {
    await initGlslang();
    const adapter: GPUAdapter = await navigator.gpu.requestAdapter();
    this.device = await adapter.requestDevice({
      extensions: {
        anisotropicFiltering: true,
      },
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    this.context = this.canvas.getContext('gpupresent');
    this.swapChain = this.context.configureSwapChain({
      device: this.device,
      format: 'bgra8unorm',
      usage: GPUTextureUsage.OUTPUT_ATTACHMENT,
    });

    await this.onInit(this.device);
    this.animationFrame.start();
  }

  public render(time: number): void {
    this.time = time;
    this.textureView = this.swapChain.getCurrentTexture().createView();
    this.commandEncoder = this.device.createCommandEncoder();
    this.onRender();
    this.device.defaultQueue.submit([this.commandEncoder.finish()]);
  }

  public abstract async onInit(device: GPUDevice): Promise<void>;

  public abstract onRender(): void;
}
