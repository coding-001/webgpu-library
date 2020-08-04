import { vec3, mat4, glMatrix, vec4 } from './vendor/gl-matrix.js';
import glslangModule from './vendor/glslang.js';

class AnimationFrame {
    constructor(callback, fps = 30, debug = false) {
        this.timeSpan = 0;
        this.timeElapsed = 0;
        this.lastTime = 0;
        this._fps = 30;
        this.debug = false;
        this.lastUpdateTime = 0;
        this.avgJSTime = 0;
        this.avgFrameTime = 0;
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
    get fps() {
        return this._fps;
    }
    set fps(value) {
        this._fps = value >= 60 ? 0 : value;
        this.timeSpan = this._fps > 0 ? 1000 / this._fps : 0;
    }
    start() {
        this.animateId = requestAnimationFrame(this._frame);
    }
    stop() {
        cancelAnimationFrame(this.animateId);
    }
    frame(time) {
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
        }
        else {
            this.timeElapsed = 0;
        }
    }
}

class TriggerEvent {
    constructor(type, source) {
        this.type = type;
        this.source = source;
    }
}

class ChangeEvent extends TriggerEvent {
    constructor(source, property, oldValue, newValue) {
        super('change', source);
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}

class Trigger {
    constructor() {
        this.listenerMap = new Map();
    }
    on(type, callback, scope) {
        const listeners = this.listenerMap.get(type);
        const bundle = { callback, scope };
        if (listeners) {
            const added = listeners.some((listener) => listener.callback === callback && listener.scope === scope);
            if (!added) {
                listeners.push(bundle);
            }
        }
        else {
            this.listenerMap.set(type, [bundle]);
        }
    }
    off(type, callback) {
        const listeners = this.listenerMap.get(type);
        if (listeners) {
            const index = listeners.findIndex((listener) => listener.callback === callback);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    fire(event) {
        const listeners = this.listenerMap.get(event.type);
        if (listeners && listeners.length) {
            listeners.forEach((listener) => {
                listener.callback.call(listener.scope, event);
            });
        }
    }
    firePropertyChanged(property, oldValue, newValue) {
        this.fire(new ChangeEvent(this.source, property, oldValue, newValue));
    }
}

let lastID = 0;
class VertexArray {
    constructor(options) {
        lastID += 1;
        this.id = lastID;
        this.buffers = options.buffers;
        this.indexBuffer = options.indexBuffer;
        this.count = options.count;
        this.mode = options.mode || 'TRIANGLES';
    }
    addBuffer(buffer) {
        this.buffers.push(buffer);
    }
}

function getClientPoint(e) {
    if (e instanceof MouseEvent) {
        return {
            x: e.clientX,
            y: e.clientY,
        };
    }
    return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
    };
}
function copyMat3ToBuffer(source, target, offset) {
    for (let i = 0; i < 3; i += 1) {
        const part = new Float32Array(source.buffer, i * 4 * 3, 3);
        target.set(part, offset + i * 4);
    }
}
function createSphereVao(radius = 1, widthSegments = 32, heightSegments = 32, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    const thetaEnd = thetaStart + thetaLength;
    let index = 0;
    const grid = [];
    const vertex = vec3.create();
    const normal = vec3.create();
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    for (let iy = 0; iy <= heightSegments; iy += 1) {
        const verticesRow = [];
        const v = iy / heightSegments;
        for (let ix = 0; ix <= widthSegments; ix += 1) {
            const u = ix / widthSegments;
            vertex[0] = -radius * Math.cos(phiStart + u * phiLength)
                * Math.sin(thetaStart + v * thetaLength);
            vertex[1] = radius * Math.cos(thetaStart + v * thetaLength);
            vertex[2] = radius * Math.sin(phiStart + u * phiLength)
                * Math.sin(thetaStart + v * thetaLength);
            vertices.push(vertex[0], vertex[1], vertex[2]);
            vec3.normalize(normal, vertex);
            normals.push(normal[0], normal[1], normal[2]);
            uvs.push(u, 1 - v);
            verticesRow.push(index);
            index += 1;
        }
        grid.push(verticesRow);
    }
    for (let iy = 0; iy < heightSegments; iy += 1) {
        for (let ix = 0; ix < widthSegments; ix += 1) {
            const a = grid[iy][ix + 1];
            const b = grid[iy][ix];
            const c = grid[iy + 1][ix];
            const d = grid[iy + 1][ix + 1];
            if (iy !== 0 || thetaStart > 0) {
                indices.push(a, b, d);
            }
            if (iy !== heightSegments - 1 || thetaEnd < Math.PI) {
                indices.push(b, c, d);
            }
        }
    }
    return new VertexArray({
        indexBuffer: new Uint32Array(indices),
        buffers: [{
                attributes: [{
                        name: 'position',
                    }],
                data: new Float32Array(vertices),
                arrayStride: 4 * 3,
            }, {
                attributes: [{
                        name: 'normal',
                    }],
                data: new Float32Array(normals),
                arrayStride: 4 * 3,
            }, {
                attributes: [{
                        name: 'uv',
                        format: 'float2',
                    }],
                data: new Float32Array(uvs),
                arrayStride: 4 * 2,
            }],
        count: indices.length,
    });
}
function createCubeVao() {
    const cubeArrayBuffer = new Float32Array([
        // Bottom
        +1, -1, +1, 0, -1, 0, 1, 1,
        -1, -1, +1, 0, -1, 0, 0, 1,
        -1, -1, -1, 0, -1, 0, 0, 0,
        +1, -1, -1, 0, -1, 0, 1, 0,
        +1, -1, +1, 0, -1, 0, 1, 1,
        -1, -1, -1, 0, -1, 0, 0, 0,
        // Right
        +1, +1, +1, 1, 0, 0, 1, 1,
        +1, -1, +1, 1, 0, 0, 0, 1,
        +1, -1, -1, 1, 0, 0, 0, 0,
        +1, +1, -1, 1, 0, 0, 1, 0,
        +1, +1, +1, 1, 0, 0, 1, 1,
        +1, -1, -1, 1, 0, 0, 0, 0,
        // Top
        -1, +1, +1, 0, 1, 0, 1, 1,
        +1, +1, +1, 0, 1, 0, 0, 1,
        +1, +1, -1, 0, 1, 0, 0, 0,
        -1, +1, -1, 0, 1, 0, 1, 0,
        -1, +1, +1, 0, 1, 0, 1, 1,
        +1, +1, -1, 0, 1, 0, 0, 0,
        // Left
        -1, -1, +1, -1, 0, 0, 1, 1,
        -1, +1, +1, -1, 0, 0, 0, 1,
        -1, +1, -1, -1, 0, 0, 0, 0,
        -1, -1, -1, -1, 0, 0, 1, 0,
        -1, -1, +1, -1, 0, 0, 1, 1,
        -1, +1, -1, -1, 0, 0, 0, 0,
        // Front
        +1, +1, +1, 0, 0, 1, 1, 1,
        -1, +1, +1, 0, 0, 1, 0, 1,
        -1, -1, +1, 0, 0, 1, 0, 0,
        -1, -1, +1, 0, 0, 1, 0, 0,
        +1, -1, +1, 0, 0, 1, 1, 0,
        +1, +1, +1, 0, 0, 1, 1, 1,
        // Back
        +1, -1, -1, 0, 0, -1, 1, 1,
        -1, -1, -1, 0, 0, -1, 0, 1,
        -1, +1, -1, 0, 0, -1, 0, 0,
        +1, +1, -1, 0, 0, -1, 1, 0,
        +1, -1, -1, 0, 0, -1, 1, 1,
        -1, +1, -1, 0, 0, -1, 0, 0,
    ]);
    return new VertexArray({
        buffers: [
            {
                attributes: [
                    {
                        name: 'position',
                    },
                    {
                        name: 'normal',
                        offset: 4 * 3,
                    },
                    {
                        name: 'uv',
                        format: 'float2',
                        offset: 4 * (3 + 3),
                    },
                ],
                arrayStride: 4 * (3 + 3 + 2),
                data: cubeArrayBuffer,
            },
        ],
        count: 36,
    });
}
// https://gpuweb.github.io/gpuweb/#coordinate-systems
function perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = far * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = near * far * nf;
    out[15] = 0;
    return out;
}

const tempVec = vec3.create();
class Camera extends Trigger {
    constructor(options) {
        super();
        this._fovy = 60;
        this._aspect = 1;
        this._near = 0.1;
        this._far = 1000;
        this._rx = 0;
        this._ry = 0;
        this._miny = -(Math.PI / 180) * 89;
        this._maxy = (Math.PI / 180) * 89;
        this.panSpeed = 0.1;
        this.zoomSpeed = 1.1;
        this.rotateSpeed = Math.PI / 180;
        this._viewMatrix = mat4.create();
        this._worldMatrix = mat4.create();
        this._projectionMatrix = mat4.create();
        this._projectionMatrixInv = mat4.create();
        this._projectionViewMatrix = mat4.create();
        this.projectionDirty = true;
        this.viewDirty = true;
        this.source = this;
        if (options) {
            if (options.position) {
                if (Array.isArray(options.position)) {
                    this._position = vec3.clone(options.position);
                }
                else {
                    this._position = options.position;
                }
            }
            if (options.target) {
                if (Array.isArray(options.target)) {
                    this._target = vec3.clone(options.target);
                }
                else {
                    this._target = options.target;
                }
            }
            if (options.up) {
                if (Array.isArray(options.up)) {
                    this._up = vec3.clone(options.up);
                }
                else {
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
    attach(canvas) {
        if (this.canvas) {
            return;
        }
        this.canvas = canvas;
        const cameraZ = vec3.create();
        const cameraX = vec3.create();
        const cameraY = vec3.create();
        let lastPoint;
        let isPanning;
        this.handleMouseMove = (e) => {
            const point = getClientPoint(e);
            const offsetX = point.x - lastPoint.x;
            const offsetY = point.y - lastPoint.y;
            const { position, target } = this;
            if (offsetX !== 0 || offsetY !== 0) {
                if (isPanning) {
                    const x = offsetX * this.panSpeed;
                    const y = offsetY * this.panSpeed;
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
                }
                else {
                    const x = offsetX * this.rotateSpeed;
                    const y = offsetY * this.rotateSpeed;
                    this.rx -= x;
                    this.ry += y;
                    vec3.sub(cameraZ, position, target);
                    const distance = vec3.length(cameraZ);
                    const xz = Math.cos(this.ry) * distance;
                    vec3.set(position, target[0] + Math.sin(this.rx) * xz, target[1] + Math.sin(this.ry) * distance, target[2] + Math.cos(this.rx) * xz);
                    this.position = position;
                    if (this.onRotate) {
                        this.onRotate(x, y);
                    }
                }
            }
            lastPoint = point;
        };
        this.clean = () => {
            lastPoint = null;
            window.removeEventListener('mousemove', this.handleMouseMove);
            window.removeEventListener('mouseup', this.clean);
            window.removeEventListener('touchmove', this.handleMouseMove);
            window.removeEventListener('touchend', this.clean);
        };
        this.handleMouseDown = (e) => {
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
        this.handleWheel = (e) => {
            if (e.deltaY !== 0) {
                const scale = e.deltaY > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
                const { position } = this;
                vec3.lerp(position, this.target, this.position, scale);
                this.position = position;
                if (this.onZoom) {
                    this.onZoom(scale);
                }
            }
        };
        this.handleContextmenu = (e) => {
            e.preventDefault();
        };
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('touchstart', this.handleMouseDown, { passive: false });
        canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        canvas.addEventListener('blur', this.clean);
        canvas.addEventListener('contextmenu', this.handleContextmenu);
    }
    detach() {
        if (!this.canvas) {
            return;
        }
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('touchstart', this.handleMouseDown);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('blur', this.clean);
        this.canvas.removeEventListener('contextmenu', this.handleContextmenu);
    }
    get worldMatrix() {
        return this.projectionViewMatrix && this._worldMatrix;
    }
    get viewMatrix() {
        if (this.viewDirty) {
            mat4.lookAt(this._viewMatrix, this.position, this.target, this.up);
            mat4.invert(this._worldMatrix, this._viewMatrix);
            this.viewDirty = false;
            mat4.mul(this._projectionViewMatrix, this.projectionMatrix, this._viewMatrix);
        }
        return this._viewMatrix;
    }
    get projectionMatrix() {
        if (this.projectionDirty) {
            perspective(this._projectionMatrix, glMatrix.toRadian(this.fovy), this.aspect, this.near, this.far);
            mat4.invert(this._projectionMatrixInv, this._projectionMatrix);
            this.projectionDirty = false;
            mat4.mul(this._projectionViewMatrix, this._projectionMatrix, this.viewMatrix);
        }
        return this._projectionMatrix;
    }
    get projectionMatrixInv() {
        return this.projectionViewMatrix && this._projectionMatrixInv;
    }
    get projectionViewMatrix() {
        if (this.projectionDirty || this.viewDirty) {
            mat4.mul(this._projectionViewMatrix, this.projectionMatrix, this.viewMatrix);
        }
        return this._projectionViewMatrix;
    }
    get fovy() {
        return this._fovy;
    }
    set fovy(value) {
        const oldValue = this._fovy;
        this._fovy = value;
        this.projectionDirty = true;
        this.firePropertyChanged('fovy', oldValue, value);
    }
    get aspect() {
        return this._aspect;
    }
    set aspect(value) {
        const oldValue = this._aspect;
        this._aspect = value;
        this.projectionDirty = true;
        this.firePropertyChanged('aspect', oldValue, value);
    }
    get near() {
        return this._near;
    }
    set near(value) {
        const oldValue = this._near;
        this._near = value;
        this.projectionDirty = true;
        this.firePropertyChanged('near', oldValue, value);
    }
    get far() {
        return this._far;
    }
    set far(value) {
        const oldValue = this._far;
        this._far = value;
        this.projectionDirty = true;
        this.firePropertyChanged('far', oldValue, value);
    }
    get position() {
        return this._position;
    }
    set position(value) {
        const oldValue = this._position;
        this._position = value;
        this.viewDirty = true;
        this.resetRotation();
        this.firePropertyChanged('position', oldValue, value);
    }
    get target() {
        return this._target;
    }
    set target(value) {
        const oldValue = this._target;
        this._target = value;
        this.viewDirty = true;
        this.resetRotation();
        this.firePropertyChanged('target', oldValue, value);
    }
    get up() {
        return this._up;
    }
    set up(value) {
        const oldValue = this._up;
        this._up = value;
        this.viewDirty = true;
        this.firePropertyChanged('up', oldValue, value);
    }
    resetRotation() {
        vec3.subtract(tempVec, this._position, this._target);
        const xz = Math.sqrt(tempVec[0] * tempVec[0] + tempVec[2] * tempVec[2]);
        this._rx = Math.atan2(tempVec[0], tempVec[2]);
        this._ry = Math.atan2(tempVec[1], xz);
    }
    get rx() {
        return this._rx;
    }
    set rx(value) {
        const oldValue = this._rx;
        this._rx = value;
        this.viewDirty = true;
        this.firePropertyChanged('rx', oldValue, value);
    }
    get ry() {
        return this._ry;
    }
    set ry(value) {
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
    get miny() {
        return this._miny;
    }
    set miny(value) {
        this._miny = value;
        if (this.ry < value) {
            this.ry = value;
        }
    }
    get maxy() {
        return this._maxy;
    }
    set maxy(value) {
        this._maxy = value;
        if (this.ry > value) {
            this.ry = value;
        }
    }
}

class KeyDefine {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
    toString() {
        return `${this.name}:${this.value}`;
    }
}

// eslint-disable-next-line import/named
let glslang;
async function initGlslang() {
    glslang = await glslangModule();
}
function compileGLSL(code, type) {
    return glslang.compileGLSLZeroCopy(code, type, true);
}
function logShaderError(e, source) {
    const formatedSource = source.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
    // TODO
    // eslint-disable-next-line no-console
    console.error(e);
    // eslint-disable-next-line no-console
    console.log(formatedSource);
}
const SHADER_PREFIX = '#version 450\n';
function buildShaderSource(shaderSource, defines) {
    if (!shaderSource) {
        return null;
    }
    let prefix = SHADER_PREFIX;
    if (defines) {
        defines.forEach((define) => {
            if (define instanceof KeyDefine) {
                prefix += `#define ${define.name} ${define.value}\n`;
            }
            else {
                prefix += `#define ${define}\n`;
            }
        });
    }
    if (shaderSource.startsWith(SHADER_PREFIX)) {
        return prefix + shaderSource.substr(SHADER_PREFIX.length);
    }
    return prefix + shaderSource;
}
class Pipeline {
    constructor(options) {
        this.bindGroups = [];
        const { device, bindGroupLayouts = [], } = options;
        this._device = device;
        this._bindGroupLayouts = bindGroupLayouts;
    }
    get device() {
        return this._device;
    }
    get bindGroupLayouts() {
        return this._bindGroupLayouts;
    }
    getBindGroupLayout(index) {
        let result = this._bindGroupLayouts[index];
        if (!result) {
            result = this.pipeline.getBindGroupLayout(index);
            this._bindGroupLayouts[index] = result;
        }
        return result;
    }
    createBindGroup(index, entries) {
        const bindingGroup = this.device.createBindGroup({
            layout: this.getBindGroupLayout(index),
            entries,
        });
        this.bindGroups[index] = bindingGroup;
        return bindingGroup;
    }
    getBindGroup(index) {
        return this.bindGroups[index];
    }
}

class ComputePipeline extends Pipeline {
    constructor(options) {
        const { computeShader, defines, bindGroupLayouts, } = options;
        super(options);
        const shaderSource = buildShaderSource(computeShader, defines);
        let computeShaderModule;
        try {
            computeShaderModule = compileGLSL(shaderSource, 'compute');
        }
        catch (e) {
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
    bind(passEncoder) {
        passEncoder.setPipeline(this.pipeline);
    }
}

const tempVec3 = vec3.create();
const tempVec4 = vec4.create();
class DataBuffer {
    constructor(device, size, usage) {
        this.offset = 0;
        this.device = device;
        this.size = size;
        this.data = new Float32Array(size);
        this.buffer = device.createBuffer({
            size: this.data.byteLength,
            usage,
        });
    }
    // eslint-disable-next-line no-dupe-class-members
    setVec3(value, normalize = false) {
        if (normalize) {
            vec3.normalize(tempVec3, value);
            this.data.set(tempVec3, this.offset);
        }
        else {
            this.data.set(value, this.offset);
        }
        this.offset += 4;
    }
    // eslint-disable-next-line no-dupe-class-members
    setVec4(value) {
        this.data.set(value, this.offset);
        this.offset += 4;
    }
    setMat3(value) {
        copyMat3ToBuffer(value, this.data, this.offset);
        this.offset += 12;
    }
    setMat4(value) {
        this.data.set(value, this.offset);
        this.offset += 16;
    }
    setValue(v0, v1, v2, v3 = 0, normalize = false) {
        if (normalize) {
            vec3.set(tempVec3, v0, v1, v2);
            vec3.normalize(tempVec3, tempVec3);
            vec4.set(tempVec4, tempVec3[0], tempVec3[1], tempVec3[2], v3);
        }
        else {
            vec4.set(tempVec4, v0, v1, v2, v3);
        }
        this.data.set(tempVec4, this.offset);
        this.offset += 4;
    }
    setData(data) {
        this.data.set(data);
        this.update();
    }
    update() {
        this.device.defaultQueue.writeBuffer(this.buffer, 0, this.data);
        this.offset = 0;
    }
    destroy() {
        this.buffer.destroy();
    }
}

class RenderPipeline extends Pipeline {
    constructor(options) {
        const { vertexShader, fragmentShader, vertexState, defines, bindGroupLayouts, alphaBlend, colorBlend, colorFormat = 'bgra8unorm', primitiveTopology = 'triangle-list', depthWriteEnabled = true, cullMode = 'none', blend = false, enableMSAA = false, depth = true, depthFormat = 'depth24plus-stencil8', depthCompare = 'less-equal', stencilReadMask = 0xFFFFFFFF, stencilWriteMask = 0xFFFFFFFF, writeMask = 0xF, stencilBack = {
            compare: 'always',
            failOp: 'keep',
            depthFailOp: 'keep',
            passOp: 'keep',
        }, stencilFront = {
            compare: 'always',
            failOp: 'keep',
            depthFailOp: 'keep',
            passOp: 'keep',
        }, } = options;
        super(options);
        this._enableMSAA = enableMSAA;
        const colorFormats = Array.isArray(colorFormat) ? colorFormat
            : [colorFormat];
        const colorStates = colorFormats.map((format) => {
            const result = {
                alphaBlend: alphaBlend || {
                    srcFactor: 'one',
                    dstFactor: blend ? 'one-minus-src-alpha' : 'zero',
                    operation: 'add',
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
        }
        catch (e) {
            logShaderError(e, vertexShaderSource);
            return;
        }
        let fragmentShaderCode;
        try {
            if (fragmentShaderSource) {
                fragmentShaderCode = compileGLSL(fragmentShaderSource, 'fragment');
            }
        }
        catch (e) {
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
            sampleCount: enableMSAA ? 4 : 1,
        };
        vertexShaderCode.free();
        if (fragmentShaderCode) {
            fragmentShaderCode.free();
        }
        this.create();
    }
    create() {
        this.pipelineDescriptor.sampleCount = this._enableMSAA ? 4 : 1;
        this.pipeline = this.device.createRenderPipeline(this.pipelineDescriptor);
    }
    // eslint-disable-next-line no-dupe-class-members
    bind(passEncoder) {
        passEncoder.setPipeline(this.pipeline);
    }
    get enableMSAA() {
        return this._enableMSAA;
    }
    set enableMSAA(value) {
        if (this._enableMSAA === value) {
            return;
        }
        this._enableMSAA = value;
        this.create();
    }
}

class StorageBuffer extends DataBuffer {
    constructor(device, size, usage = GPUBufferUsage.COPY_DST) {
        // eslint-disable-next-line no-bitwise
        super(device, size, GPUBufferUsage.STORAGE | usage);
    }
}

class UniformBuffer extends DataBuffer {
    constructor(device, size, usage = GPUBufferUsage.COPY_DST) {
        // eslint-disable-next-line no-bitwise
        super(device, size, GPUBufferUsage.UNIFORM | usage);
    }
}

// https://github.com/gpuweb/gpuweb/issues/26
// D3D12 or Metal has no VK_PRIMITIVE_TOPOLOGY_TRIANGLE_FAN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODE_MAP = {
    POINTS: 'point-list',
    LINES: 'line-list',
    LINE_LOOP: '',
    LINE_STRIP: 'line-strip',
    TRIANGLES: 'triangle-list',
    TRIANGLE_STRIP: 'triangle-strip',
    TRIANGLE_FAN: '',
};
class VertexArrayState {
    constructor(device, vao) {
        this.buffers = [];
        this.keys = [];
        this.vertexBuffers = [];
        this.vertexState = {
            indexFormat: 'uint32',
            vertexBuffers: this.vertexBuffers,
        };
        this.instanceCount = 1;
        this.keys.push('uint32');
        if (vao.indexBuffer) {
            const buffer = device.createBuffer({
                size: vao.indexBuffer.byteLength,
                usage: GPUBufferUsage.INDEX,
                mappedAtCreation: true,
            });
            const arrayBuffer = buffer.getMappedRange();
            if (vao.indexBuffer instanceof Uint16Array) {
                this.vertexState.indexFormat = 'uint16';
                this.keys[0] = 'uint16';
                new Uint16Array(arrayBuffer).set(vao.indexBuffer);
            }
            else if (vao.indexBuffer instanceof Uint32Array) {
                new Uint32Array(arrayBuffer).set(vao.indexBuffer);
            }
            buffer.unmap();
            this.indexBuffer = buffer;
        }
        let inShaderLocation = 0;
        let outShaderLocation = 0;
        const bufferMap = new Map();
        vao.buffers.forEach((buffer, i) => {
            if (buffer.instanceCount) {
                this.instanceCount = buffer.instanceCount;
            }
            this.keys.push(`buffer${i}`);
            const attributes = [];
            const vertexBuffer = {
                arrayStride: buffer.arrayStride,
                stepMode: buffer.instanceCount ? 'instance' : 'vertex',
                attributes,
            };
            this.vertexBuffers.push(vertexBuffer);
            buffer.attributes.forEach((attribute) => {
                attributes.push({
                    offset: attribute.offset || 0,
                    format: attribute.format || 'float3',
                    shaderLocation: inShaderLocation,
                });
                const name = attribute.name.toUpperCase();
                this.keys.push(new KeyDefine(`IN_${name}`, inShaderLocation));
                if (!buffer.instanceCount) {
                    this.keys.push(new KeyDefine(`OUT_${name}`, outShaderLocation));
                    if (attribute.name === 'tangent') {
                        outShaderLocation += 3;
                    }
                    else {
                        outShaderLocation += 1;
                    }
                }
                inShaderLocation += 1;
            });
            let gpuBuffer = bufferMap.get(buffer.data);
            if (!gpuBuffer) {
                const mappedBuffer = device.createBuffer({
                    size: buffer.data.byteLength,
                    usage: GPUBufferUsage.VERTEX,
                    mappedAtCreation: true,
                });
                const arrayBuffer = mappedBuffer.getMappedRange();
                gpuBuffer = mappedBuffer;
                // TODO: handle other type
                if (buffer.data instanceof Float32Array) {
                    new Float32Array(arrayBuffer).set(buffer.data);
                }
                gpuBuffer.unmap();
                bufferMap.set(buffer.data, gpuBuffer);
            }
            this.buffers.push({ buffer: gpuBuffer, offset: buffer.offset || 0 });
        });
        this.count = vao.count;
        this.keys.push(vao.mode);
        this.keys.push(new KeyDefine('NEXT_OUT_LOCATION', outShaderLocation));
        this.key = this.keys.join(',');
        this.primitiveTopology = MODE_MAP[vao.mode];
    }
    // eslint-disable-next-line no-dupe-class-members
    bind(bundleEncoder) {
        this.buffers.forEach((buffer, i) => {
            bundleEncoder.setVertexBuffer(i, buffer.buffer, buffer.offset);
        });
        if (this.indexBuffer) {
            bundleEncoder.setIndexBuffer(this.indexBuffer);
        }
    }
    // eslint-disable-next-line no-dupe-class-members
    draw(bundleEncoder) {
        if (this.indexBuffer) {
            bundleEncoder.drawIndexed(this.count, this.instanceCount);
        }
        else {
            bundleEncoder.draw(this.count, this.instanceCount);
        }
    }
    destroy() {
        if (this.indexBuffer) {
            this.indexBuffer.destroy();
            this.indexBuffer = null;
        }
        this.buffers.forEach((buffer) => {
            buffer.buffer.destroy();
        });
        this.buffers = null;
    }
}

class LiteApp {
    constructor(options = {}) {
        const canvas = document.getElementById('canvas');
        const { width = window.innerWidth, height = window.innerHeight, } = options;
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
    async init() {
        await initGlslang();
        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
    render(time) {
        this.time = time;
        this.textureView = this.swapChain.getCurrentTexture().createView();
        this.commandEncoder = this.device.createCommandEncoder();
        this.onRender();
        this.device.defaultQueue.submit([this.commandEncoder.finish()]);
    }
}

export { AnimationFrame, Camera, ChangeEvent, ComputePipeline, DataBuffer, KeyDefine, LiteApp, Pipeline, RenderPipeline, StorageBuffer, Trigger, TriggerEvent, UniformBuffer, VertexArray, VertexArrayState, copyMat3ToBuffer, createCubeVao, createSphereVao, getClientPoint, initGlslang, perspective };
