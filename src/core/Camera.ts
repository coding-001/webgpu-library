import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Trigger from './Trigger';
import { getClientPoint, perspective } from './Util';

export interface CameraDescriptor {
  aspect?: number;
  far?: number;
  fovy?: number;
  near?: number;
  position?: vec3 | [number, number, number];
  target?: vec3 | [number, number, number];
  up?: vec3 | [number, number, number];
  miny?: number;
  maxy?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  rotateSpeed?: number;
}

const tempVec = vec3.create();

export default class Camera extends Trigger {
  public canvas: HTMLCanvasElement;

  private _fovy = 60;

  private _aspect = 1;

  private _near = 0.1;

  private _far = 1000;

  private _position: vec3;

  private _target: vec3;

  private _up: vec3;

  private _rx = 0;

  private _ry = 0;

  private _miny = -(Math.PI / 180) * 89;

  private _maxy = (Math.PI / 180) * 89;

  public panSpeed = 0.1;

  public zoomSpeed = 1.1;

  public rotateSpeed = Math.PI / 180;

  private _viewMatrix: mat4 = mat4.create();

  private _worldMatrix: mat4 = mat4.create();

  private _projectionMatrix: mat4 = mat4.create();

  private _projectionMatrixInv: mat4 = mat4.create();

  private _projectionViewMatrix: mat4 = mat4.create();

  private projectionDirty = true;

  private viewDirty = true;

  private handleMouseDown: (e: MouseEvent) => void;

  private handleMouseMove: (e: MouseEvent) => void;

  private handleWheel: (e: WheelEvent) => void;

  private clean: () => void;

  private handleContextmenu: (e: MouseEvent) => void;

  public onPan: (x: number, y: number) => void;

  public onRotate: (x: number, y: number) => void;

  public onZoom: (zoom: number) => void;

  public constructor(options?: CameraDescriptor) {
    super();
    if (options) {
      if (options.position) {
        if (Array.isArray(options.position)) {
          this._position = vec3.clone(options.position);
        } else {
          this._position = options.position;
        }
      }
      if (options.target) {
        if (Array.isArray(options.target)) {
          this._target = vec3.clone(options.target);
        } else {
          this._target = options.target;
        }
      }
      if (options.up) {
        if (Array.isArray(options.up)) {
          this._up = vec3.clone(options.up);
        } else {
          this._up = options.up;
        }
      }
      if (options.aspect != null) {
        this._aspect = options.aspect;
      }
      if (options.far != null) {
        this._far = options.far;
      }
      if (options.fovy != null) {
        this._fovy = options.fovy;
      }
      if (options.near != null) {
        this._near = options.near;
      }
      if (options.miny != null) {
        this._miny = options.miny;
      }
      if (options.maxy != null) {
        this._maxy = options.maxy;
      }
      if (options.panSpeed != null) {
        this.panSpeed = options.panSpeed;
      }
      if (options.rotateSpeed != null) {
        this.rotateSpeed = options.rotateSpeed;
      }
      if (options.zoomSpeed != null) {
        this.zoomSpeed = options.zoomSpeed;
      }
    }
    this._position = this._position || vec3.fromValues(0, 0, 10);
    this._target = this._target || vec3.create();
    this._up = this._up || vec3.fromValues(0, 1, 0);
    this.resetRotation();
  }

  public attach(canvas: HTMLCanvasElement): void {
    if (this.canvas) {
      return;
    }
    this.canvas = canvas;

    const cameraZ = vec3.create();
    const cameraX = vec3.create();
    const cameraY = vec3.create();
    let lastPoint: { x: number; y: number };
    let isPanning: boolean;

    this.handleMouseMove = (e: MouseEvent): void => {
      const point = getClientPoint(e);
      const offsetX: number = point.x - lastPoint.x;
      const offsetY: number = point.y - lastPoint.y;
      const { position, target } = this;
      if (offsetX !== 0 || offsetY !== 0) {
        if (isPanning) {
          const x: number = offsetX * this.panSpeed;
          const y: number = offsetY * this.panSpeed;
          vec3.sub(cameraZ, position, target);
          vec3.normalize(cameraZ, cameraZ);
          vec3.cross(cameraX, this.up, cameraZ);
          vec3.cross(cameraY, cameraZ, cameraX);

          vec3.scaleAndAdd(position, position, cameraX, -x);
          vec3.scaleAndAdd(position, position, cameraY, y);
          vec3.scaleAndAdd(target, target, cameraX, -x);
          vec3.scaleAndAdd(target, target, cameraY, y);

          this.position = position;
          this.target = target;

          if (this.onPan) {
            this.onPan(x, y);
          }
        } else {
          const x: number = offsetX * this.rotateSpeed;
          const y: number = offsetY * this.rotateSpeed;
          this.rx -= x;
          this.ry += y;
          vec3.sub(cameraZ, position, target);
          const distance: number = vec3.length(cameraZ);
          const xz: number = Math.cos(this.ry) * distance;
          vec3.set(
            position,
            target[0] + Math.sin(this.rx) * xz,
            target[1] + Math.sin(this.ry) * distance,
            target[2] + Math.cos(this.rx) * xz,
          );
          this.position = position;

          if (this.onRotate) {
            this.onRotate(x, y);
          }
        }
      }
      lastPoint = point;
    };

    this.clean = (): void => {
      lastPoint = null;
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.clean);
      window.removeEventListener('touchmove', this.handleMouseMove);
      window.removeEventListener('touchend', this.clean);
    };

    this.handleMouseDown = (e: MouseEvent): void => {
      e.preventDefault();
      if (e.button !== 0 && e.button !== 2) {
        return;
      }
      isPanning = e.button === 2;
      this.canvas.focus();
      lastPoint = getClientPoint(e);
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.clean);
      window.addEventListener('touchmove', this.handleMouseMove);
      window.addEventListener('touchend', this.clean);
    };

    this.handleWheel = (e: WheelEvent): void => {
      if (e.deltaY !== 0) {
        const scale: number = e.deltaY > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
        const { position } = this;
        vec3.lerp(position, this.target, this.position, scale);
        this.position = position;
        if (this.onZoom) {
          this.onZoom(scale);
        }
      }
    };

    this.handleContextmenu = (e: MouseEvent): void => {
      e.preventDefault();
    };

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('touchstart', this.handleMouseDown, { passive: false });
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('blur', this.clean);
    canvas.addEventListener('contextmenu', this.handleContextmenu);
  }

  public detach(): void {
    if (!this.canvas) {
      return;
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('touchstart', this.handleMouseDown);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('blur', this.clean);
    this.canvas.removeEventListener('contextmenu', this.handleContextmenu);
  }

  public get worldMatrix(): mat4 {
    return this.projectionViewMatrix && this._worldMatrix;
  }

  public get viewMatrix(): mat4 {
    if (this.viewDirty) {
      mat4.lookAt(this._viewMatrix, this.position, this.target, this.up);
      mat4.invert(this._worldMatrix, this._viewMatrix);
      this.viewDirty = false;
      mat4.mul(this._projectionViewMatrix, this.projectionMatrix, this._viewMatrix);
    }
    return this._viewMatrix;
  }

  public get projectionMatrix(): mat4 {
    if (this.projectionDirty) {
      perspective(
        this._projectionMatrix,
        glMatrix.toRadian(this.fovy),
        this.aspect,
        this.near,
        this.far,
      );
      mat4.invert(this._projectionMatrixInv, this._projectionMatrix);
      this.projectionDirty = false;
      mat4.mul(this._projectionViewMatrix, this._projectionMatrix, this.viewMatrix);
    }
    return this._projectionMatrix;
  }

  public get projectionMatrixInv(): mat4 {
    return this.projectionViewMatrix && this._projectionMatrixInv;
  }

  public get projectionViewMatrix(): mat4 {
    if (this.projectionDirty || this.viewDirty) {
      mat4.mul(this._projectionViewMatrix, this.projectionMatrix, this.viewMatrix);
    }
    return this._projectionViewMatrix;
  }

  public get fovy(): number {
    return this._fovy;
  }

  public set fovy(value) {
    const oldValue = this._fovy;
    this._fovy = value;
    this.projectionDirty = true;
    this.firePropertyChanged('fovy', oldValue, value);
  }

  public get aspect(): number {
    return this._aspect;
  }

  public set aspect(value) {
    const oldValue = this._aspect;
    this._aspect = value;
    this.projectionDirty = true;
    this.firePropertyChanged('aspect', oldValue, value);
  }

  public get near(): number {
    return this._near;
  }

  public set near(value) {
    const oldValue = this._near;
    this._near = value;
    this.projectionDirty = true;
    this.firePropertyChanged('near', oldValue, value);
  }

  public get far(): number {
    return this._far;
  }

  public set far(value) {
    const oldValue = this._far;
    this._far = value;
    this.projectionDirty = true;
    this.firePropertyChanged('far', oldValue, value);
  }

  public get position(): vec3 {
    return this._position;
  }

  public set position(value) {
    const oldValue = this._position;
    this._position = value;
    this.viewDirty = true;
    this.resetRotation();
    this.firePropertyChanged('position', oldValue, value);
  }

  public get target(): vec3 {
    return this._target;
  }

  public set target(value) {
    const oldValue = this._target;
    this._target = value;
    this.viewDirty = true;
    this.resetRotation();
    this.firePropertyChanged('target', oldValue, value);
  }

  public get up(): vec3 {
    return this._up;
  }

  public set up(value: vec3) {
    const oldValue = this._up;
    this._up = value;
    this.viewDirty = true;
    this.firePropertyChanged('up', oldValue, value);
  }

  private resetRotation(): void {
    vec3.subtract(tempVec, this._position, this._target);
    const xz = Math.sqrt(tempVec[0] * tempVec[0] + tempVec[2] * tempVec[2]);
    this._rx = Math.atan2(tempVec[0], tempVec[2]);
    this._ry = Math.atan2(tempVec[1], xz);
  }

  public get rx(): number {
    return this._rx;
  }

  public set rx(value) {
    const oldValue = this._rx;
    this._rx = value;
    this.viewDirty = true;
    this.firePropertyChanged('rx', oldValue, value);
  }

  public get ry(): number {
    return this._ry;
  }

  public set ry(value) {
    let newValue = value;
    if (newValue > this.maxy) {
      newValue = this.maxy;
    }
    if (newValue < this.miny) {
      newValue = this.miny;
    }
    const oldValue = this._ry;
    this._ry = newValue;
    this.viewDirty = true;
    this.firePropertyChanged('ry', oldValue, newValue);
  }

  public get miny(): number {
    return this._miny;
  }

  public set miny(value) {
    this._miny = value;
    if (this.ry < value) {
      this.ry = value;
    }
  }

  public get maxy(): number {
    return this._maxy;
  }

  public set maxy(value) {
    this._maxy = value;
    if (this.ry > value) {
      this.ry = value;
    }
  }
}
