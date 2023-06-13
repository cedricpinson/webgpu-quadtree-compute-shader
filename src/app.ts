import { mat4 } from "gl-matrix";
import { Manipulator, setupManipulator } from "./manipulator";

interface WebGPUContext {
    device: GPUDevice,
    context: GPUCanvasContext,
    adapter: GPUAdapter,
    canvas: HTMLCanvasElement,
    hasQueryTimer: boolean
}

interface MoveCamera {
    start: Array<number>,
    stop: Array<number>,
    current: Array<number>,
    t: number,
    duration: number
};

interface Config {
    maxLod: number
    debug: boolean
    debugBuffers: boolean
    position: Object
    wireframe: boolean
    frameNumber: number
    lodScaleFactor: number
    projectToEarth: boolean
    evaluateLodIn3D: boolean
    evaluateRealCamera: boolean
    elevationScale: number
    pause: boolean
    frameTime: number
    updateQuadTree: number
    renderQuadTree: number
    gridResolution: number
    displayTexture: number
    pauseTree: number
    camera: MoveCamera
    rotate: boolean
}

interface Application {
    pane: any,
    config: Config,
    wgpu: WebGPUContext,
    projectionMatrix: mat4,
    modelMatrix: mat4,
    manipulator: Manipulator,
};

const app: Application = {
    pane: null,
    config: {
        maxLod: 9,
        projectToEarth: false,
        evaluateLodIn3D: false,
        evaluateRealCamera: false,
        displayTexture: 0,
        gridResolution: 1,
        lodScaleFactor: 2.0,
        debug: false,
        debugBuffers: false,
        elevationScale: 1.0,
        position: { x: 0.0, y: 0.0 },
        wireframe: true,
        frameNumber: 0,
        pause: false,
        frameTime: 0,
        updateQuadTree: 0,
        renderQuadTree: 0,
        pauseTree: 0,
        rotate: false,
        camera: {
            start: [-0.5, -0.5],
            stop: [0.5, 0.5],
            current: [0, 0],
            t: 0.0,
            duration: 120.0,
        },
    },
    manipulator: {} as Manipulator,
    wgpu: null,
    projectionMatrix: null,
    modelMatrix: null,
};

export { app, MoveCamera };
