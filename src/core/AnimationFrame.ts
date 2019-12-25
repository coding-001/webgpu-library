export default class AnimationFrame {
  private callback: Function;

  private timeSpan = 0;

  private timeElapsed = 0;

  private lastTime = 0;

  private _fps = 30;

  private animateId: number;

  private _frame: FrameRequestCallback;

  public debug = false;

  private debugDiv: HTMLDivElement;

  private lastUpdateTime = 0;

  private avgJSTime = 0;

  private avgFrameTime = 0;

  public constructor(callback: Function, fps = 30, debug = false) {
    this.callback = callback;
    this.fps = fps;
    this.debug = debug;
    this._frame = this.frame.bind(this);
    const debugDiv = document.createElement('div');
    this.debugDiv = debugDiv;
    debugDiv.style.position = 'absolute';
    debugDiv.style.zIndex = '100';
    debugDiv.style.top = '0px';
    debugDiv.style.color = 'white';
    debugDiv.style.textShadow = '0px 0px 2px black, -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black';
    document.body.appendChild(debugDiv);
  }

  public get fps(): number {
    return this._fps;
  }

  public set fps(value: number) {
    this._fps = value >= 60 ? 0 : value;
    this.timeSpan = this._fps > 0 ? 1000 / this._fps : 0;
  }

  public start(): void {
    this.animateId = requestAnimationFrame(this._frame);
  }

  public stop(): void {
    cancelAnimationFrame(this.animateId);
  }

  private frame(time: number): void {
    this.start();

    this.timeElapsed += time - this.lastTime;
    this.lastTime = time;
    if (this.timeElapsed < this.timeSpan) {
      return;
    }

    const start = performance.now();
    this.callback(time);

    if (this.debug) {
      this.avgJSTime = this.avgJSTime * 0.8 + (performance.now() - start) * 0.2;
      this.avgFrameTime = this.avgFrameTime * 0.8 + this.timeElapsed * 0.2;
    }

    if (this.debug && (time - this.lastUpdateTime > 100)) {
      this.debugDiv.innerHTML = `JS: ${this.avgJSTime.toFixed(2)}<br>Draw: ${this.avgFrameTime.toFixed(2)}`;
      this.lastUpdateTime = time;
    }
    if (this.timeSpan > 0) {
      this.timeElapsed %= this.timeSpan;
    } else {
      this.timeElapsed = 0;
    }
  }
}
