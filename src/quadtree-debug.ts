import { app } from "./app"
import { QuadTree, QuadNodeSize } from "./quadtree-types"

// indirect data is used to store next compute indirect dispatch
// u32, u32, u32, u32
// x,   y,   z,   numQuads
const IndirectSize = 4 * Uint32Array.BYTES_PER_ELEMENT;


// vertex is a vec4
// f32, f32, f32, f32
const VertexSize = 4 * Float32Array.BYTES_PER_ELEMENT;
const VertexQuadSize = 6 * VertexSize;

function addDebugComputeCommands(commandEncoder: GPUCommandEncoder, quadTree: QuadTree, prevBufferIndex: number, currentBufferIndex: number) {
    // node buffer size is 2 * uint32 * maxNodes + 4 uint32 for indirect dispatch
    const nodeBufferSize = QuadNodeSize * quadTree.maxNodes;
    const bufferSize = nodeBufferSize + IndirectSize;

    // we encode node + dispatch in one debug buffer
    const copyComputeShaderBuffer = function (commandEncoder: GPUCommandEncoder, nodeBuffer: GPUBuffer, dispatchBuffer: GPUBuffer, name: string) {
        console.log(`write ${nodeBuffer.label} : ${name}`);
        // dispatchIndirect buffer
        const debugBuffer = app.wgpu.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: nodeBuffer.label,
        });

        // Encode commands for copying buffer to buffer.
        commandEncoder.copyBufferToBuffer(
            nodeBuffer /* source buffer */,
            0 /* source offset */,
            debugBuffer /* destination buffer */,
            0 /* destination offset */,
            nodeBufferSize /* size */
        );

        // Encode commands for copying dispatch.
        commandEncoder.copyBufferToBuffer(
            dispatchBuffer /* source buffer */,
            0 /* source offset */,
            debugBuffer /* destination buffer */,
            nodeBufferSize /* destination offset */,
            IndirectSize /* size */
        );

        return debugBuffer;
    };

    const prevNodeBuffer = quadTree.nodeBuffers[prevBufferIndex].nodeBuffer;
    const prevDispatchBuffer = quadTree.nodeBuffers[prevBufferIndex].dispatchIndirect;

    const currentNodeBuffer = quadTree.nodeBuffers[currentBufferIndex].nodeBuffer;
    const currentDispatchBuffer = quadTree.nodeBuffers[currentBufferIndex].dispatchIndirect;

    return [
        copyComputeShaderBuffer(commandEncoder, prevNodeBuffer, prevDispatchBuffer, 'previous'),
        copyComputeShaderBuffer(commandEncoder, currentNodeBuffer, currentDispatchBuffer, 'current'),
    ];
}


function undilate(x: number) {
    x = (x | (x >> 1)) & 0x33333333;
    x = (x | (x >> 2)) & 0x0f0f0f0f;
    x = (x | (x >> 4)) & 0x00ff00ff;
    x = (x | (x >> 8)) & 0x0000ffff;
    return x & 0x0000ffff;
}

// # functions with 16 are the technics with the bit to start the node encoding
// # this is this version I am interested by.
// #
// # ---- ---- ---- ---- ---- ---- 0111 0000
// #                                ^ leading bit to start encoding
// #
// # '0b01 11 10 01'      -> 121 in the format with leading bit to start encoding
// #     -

function firstLeadingBit(n: number) {

    if (n == 0) {
        return -1;
    }

    let ndx = 0;
    while (1 < n) {
        n = (n >> 1);
        ndx += 1;
    }

    return ndx;
}

function decode(key: number) {
    let leading_bit = firstLeadingBit(key);
    let level = leading_bit >> 1;
    // # remove level bit
    let k = ~(1 << leading_bit);
    k = k & key;
    let x = undilate(k & 0x55555555);
    let y = undilate((k >> 1) & 0x55555555);
    return [level, x, y];
}

function createCoord(key_tupple: Array<number>) {
    let size = 1.0 / (1 << key_tupple[0]);
    let x = key_tupple[1] * size;
    let y = key_tupple[2] * size;
    return [x,y, size];
}




async function dumpDebugComputeData(debugBuffers: Array<GPUBuffer>, maxNodes: number, frameNumber: number) {

    // node buffer size is uint32 * maxNodes + 4 uint32 for indirect dispatch
    const nodeBufferSize = QuadNodeSize * maxNodes;
    const bufferSize = nodeBufferSize + IndirectSize;

    // const dec2bin = function (dec) {
    //     return (dec >>> 0).toString(2);
    // };
    const dec2bin = function (nMask: number) {
        // nMask must be between -2147483648 and 2147483647
        for (var nFlag = 0, nShifted = nMask, sMask = ""; nFlag < 32;
            nFlag++, sMask += String(nShifted >>> 31), nShifted <<= 1);
        return sMask;
    };

    const dumpBuffer = async function (buffer: GPUBuffer, label: String) {

        await buffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = buffer.getMappedRange();

        const nodesData = new Uint32Array(arrayBuffer, 0, nodeBufferSize / Uint32Array.BYTES_PER_ELEMENT);
        const indirectData = new Uint32Array(arrayBuffer, nodeBufferSize, IndirectSize / Uint32Array.BYTES_PER_ELEMENT);

        const numQuads = indirectData[3];

        const l = `${label} : numQuads ${numQuads} : (${indirectData[0]}, ${indirectData[1]}, ${indirectData[2]}, ${indirectData[3]})`;
        console.groupCollapsed(l);

        for (let i = 0; i < numQuads; i++) {
            const bin = dec2bin(nodesData[i * 2]);
            const nodeData = decode(nodesData[i * 2]);
            const coord = createCoord(nodeData);

            const indx = nodesData[i * 2 + 1];
            const data = `index ${i}: ${bin} : ${indx} : [ ${coord[0]}, ${coord[1]}, ${coord[2]}]`;
            console.log(data);
        }

        console.groupEnd();

        buffer.unmap();
        buffer.destroy();

        return true;
    };

    const label = `compute data frame: ${frameNumber}`;
    console.groupCollapsed(label);

    dumpBuffer(debugBuffers[0], 'previousBuffer');
    dumpBuffer(debugBuffers[1], 'currentBuffer');

    console.groupEnd();

    return true;
}


function addDebugRenderCommands(commandEncoder: GPUCommandEncoder, vertexBuffer: GPUBuffer, indirectBuffer: GPUBuffer) {
    // 256 quads
    // 6 vertices -> 2 triangles
    // 16 -> vertex size
    // + 4 * 4 for the indirect data
    const vertexBufferSize = 256 * VertexQuadSize;
    const bufferSize = vertexBufferSize + IndirectSize;
    const gpuDebugBuffer = app.wgpu.device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
        vertexBuffer /* source buffer */,
        0 /* source offset */,
        gpuDebugBuffer /* destination buffer */,
        0 /* destination offset */,
        vertexBufferSize /* size */
    );

    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
        indirectBuffer /* source buffer */,
        0 /* source offset */,
        gpuDebugBuffer /* destination buffer */,
        vertexBufferSize /* destination offset */,
        IndirectSize /* size */
    );

    return gpuDebugBuffer;
}

async function dumpDebugRenderData(debugBuffer: GPUBuffer, frameNumber: number) {

    await debugBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = debugBuffer.getMappedRange();
    const verticesData = new Float32Array(arrayBuffer, 0, 256 * VertexQuadSize / Float32Array.BYTES_PER_ELEMENT);
    const indirectData = new Uint32Array(arrayBuffer, 256 * 6 * 4 * 4, IndirectSize / Uint32Array.BYTES_PER_ELEMENT);

    const label = `render data : frame ${frameNumber}`;
    console.groupCollapsed(label);
    for (let j = 0; j < verticesData.length / 4; j++) {
        const x = verticesData[j * 4 + 0];
        const y = verticesData[j * 4 + 1];
        const z = verticesData[j * 4 + 2];
        const index = verticesData[j * 4 + 3];
        const vertex = `qindex ${index} : ${x}:${y}:${z}`;
        console.log(vertex);
    }

    // vertexCount: atomic<u32>,
    // instanceCount: u32,
    // firstVertex: u32,
    // firstInstance: u32,

    const vertexCount = indirectData[0];
    const instanceCount = indirectData[1];
    const firstVertex = indirectData[2];
    const firstInstance = indirectData[3];
    const indirect = `vertexCount ${vertexCount} instanceCount ${instanceCount} firstVertex ${firstVertex} firstInstance ${firstInstance}`;
    console.log(indirect);
    console.groupEnd();

    debugBuffer.unmap();
    debugBuffer.destroy();

    return true;
}

export { dumpDebugRenderData, addDebugRenderCommands, addDebugComputeCommands, dumpDebugComputeData };
