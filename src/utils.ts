import { glMatrix, mat4 } from "gl-matrix";
import { app } from "./app";

async function loadImage(path: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous' // to avoid CORS if used with Canvas
    img.src = path;
    await img.decode();
    const imageBitmap = await createImageBitmap(img);
    return imageBitmap;
}

function createTexture(image: ImageBitmap, inputFormat: GPUTextureFormat): GPUTexture {

    let textureFormat: GPUTextureFormat = 'rgba8unorm';
    if (inputFormat) {
        textureFormat = inputFormat;
    }

    let texture = app.wgpu.device.createTexture({
        size: [image.width, image.height, 1],
        format: textureFormat,
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
    });

    app.wgpu.device.queue.copyExternalImageToTexture(
        { source: image },
        { texture: texture },
        [image.width, image.height]
    );

    return texture;
}

function checkSupport() {
    if (!navigator.gpu) {
        document.body.innerHTML = `
            <h1>WebGPU not supported!</h1>
            <div>
                SPIR-V WebGPU is currently only supported in <a href="https://www.google.com/chrome/canary/">Chrome Canary</a>
                with the flag "enable-unsafe-webgpu" enabled.
            </div>
            <div>
                See the <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status">Implementation Status</a> page for more details.
            </div>
        `;

        throw new Error("WebGPU not supported");
    }
}

// got the code from https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
// I dont get all the details but it works, I am not interested to understand the details right now
function setupResize(canvas: HTMLCanvasElement, resizeCallback: Function) {

    function onResize(entries: any) {

        for (const entry of entries) {
            let width: number;
            let height: number;
            let dpr = window.devicePixelRatio;
            let dprSupport = false;
            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other paths are an imperfect fallback
                // for browsers that don't provide anyway to do this
                width = entry.devicePixelContentBoxSize[0].inlineSize;
                height = entry.devicePixelContentBoxSize[0].blockSize;
                dpr = 1; // it's already in width and height
                dprSupport = true;

            } else if (entry.contentBoxSize) {
                if (entry.contentBoxSize[0]) {
                    width = entry.contentBoxSize[0].inlineSize;
                    height = entry.contentBoxSize[0].blockSize;
                } else {
                    // legacy
                    width = entry.contentBoxSize.inlineSize;
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                // legacy
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
            const displayWidth = Math.round(width * dpr);
            const displayHeight = Math.round(height * dpr);
            resizeCallback(displayWidth, displayHeight);
            if (!dprSupport) {
                console.log("no dpi support");
            }
        }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, { box: 'content-box' });
}

function readBuffer(device: GPUDevice, buffer: GPUBuffer) {
    const size = buffer.size;
    // Get a GPU buffer for reading in an unmapped state.
    const gpuReadBuffer = device.createBuffer({
        size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const copyEncoder = device.createCommandEncoder();
    copyEncoder.copyBufferToBuffer(
        buffer /* source buffer */,
        0 /* source offset */,
        gpuReadBuffer /* destination buffer */,
        0 /* destination offset */,
        size /* size */
    );

    // Submit copy commands.
    const copyCommands = copyEncoder.finish();
    device.queue.submit([copyCommands]);

    return gpuReadBuffer;
}

function computeOrthoMatrix(projection: mat4, canvas: HTMLCanvasElement) {
    const w = canvas.width;
    const h = canvas.height;
    //    mat4.ortho(projection, -w * 0.5, w * 0.5, -h * 0.5, h * 0.5, -10, 10);
    mat4.ortho(projection, -w * 0.5, w * 0.5, -h * 0.5, h * 0.5, -1000, 1000);
}

async function initWebGPU(canvas: HTMLCanvasElement) {

    checkSupport();

    const adapter = await navigator.gpu.requestAdapter();
    let device = null;
    let hasQueryTimer = false;
    let requiredFeatures = [];
    if (adapter.features.has('timestamp-query') === true) {
        requiredFeatures.push('timestamp-query');
        hasQueryTimer = true;
    }

    device = await adapter.requestDevice({
        requiredFeatures
    });

    if (hasQueryTimer) {
        console.info("timestamp enabled");
    } else {
        console.info("timestamp query not enabled");
    }

    console.log(device.limits);
    var wgpu = {
        device: device,
        context: canvas.getContext("webgpu"),
        adapter: adapter,
        canvas: canvas,
        hasQueryTimer: hasQueryTimer
    };

    wgpu.context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'opaque'
    });

    return wgpu;
}

function saveFile(data, filename: string = 'export.json') {

    if (!data) {
        console.error('Console.save: No data')
        return;
    }

    if (typeof data === "object") {
        data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], { type: 'text/json' }),
        e = document.createEvent('MouseEvents'),
        a = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

export { initWebGPU, loadImage, readBuffer, computeOrthoMatrix, setupResize, createTexture, saveFile }