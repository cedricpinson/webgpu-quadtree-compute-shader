import { app } from "./app"
import { QuadTree, QuadTreeFunctions, QuadTreeConfig, QuadTreeConfigSize, QuadNodeSize, PingPongComputeBuffer, QueryCounter, IndexedGeometry, Grid1, Grid4, GridGeometry, RenderGeometry } from "./quadtree-types"
import { dumpDebugRenderData, addDebugRenderCommands, addDebugComputeCommands, dumpDebugComputeData } from "./quadtree-debug"
import { createAnnotations } from "./annotation"
import { readBuffer } from "./utils"

// @ts-ignore
import DrawShader from "bundle-text:./draw-quadtree.wgsl"

// @ts-ignore
import ComputeShader from "bundle-text:./compute-quadtree.wgsl"

// @ts-ignore
import NodeFunctions from "bundle-text:./node-functions.wgsl"

function getQuadTreeComputeShader(workgroupSize: number) {
    console.log('workgroup size', workgroupSize);
    // workgroupSize must be power of two
    const workgroupBitShift = Math.log2(workgroupSize);
    if ((1 << workgroupBitShift) !== Math.floor(workgroupSize)) {
        throw `workgroupSize must be power of two (${workgroupSize})`;
    }

    const define = `
    const WORKGROUP_BIT_SHIFT : u32 = ${workgroupBitShift};\n
    const WORKGROUP_SIZE : u32 = ${workgroupSize};\n
    `;
    return define + NodeFunctions + ComputeShader;
}

function timestamp(query: QueryCounter, label: String) {
    if (!app.wgpu.hasQueryTimer) {
        return;
    }

    if (query.index == query.capacity) {
        console.error("too many query", query.index, label);
        return;
    }
    const index = query.index;
    query.labelMap.set(label, query.index);
    query.index++;
    return index;
}

function createQuadGeometry(grid: GridGeometry): any {
    const positionBuffer = app.wgpu.device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * grid.vertices.length,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(positionBuffer.getMappedRange()).set(grid.vertices);
    positionBuffer.unmap();

    // Create the model index buffer.
    const triangleIndexBuffer = app.wgpu.device.createBuffer({
        size: grid.triangles.length * Uint16Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
    });
    new Uint16Array(triangleIndexBuffer.getMappedRange()).set(grid.triangles);
    triangleIndexBuffer.unmap();


    // Create the model index buffer.
    const wireframeIndexBuffer = app.wgpu.device.createBuffer({
        size: grid.lines.length * Uint16Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
    });
    new Uint16Array(wireframeIndexBuffer.getMappedRange()).set(grid.lines);
    wireframeIndexBuffer.unmap();

    let triangles: IndexedGeometry = {
        index: triangleIndexBuffer,
        position: positionBuffer,
        numIndices: grid.triangles.length,
    };

    let wireframes: IndexedGeometry = {
        index: wireframeIndexBuffer,
        position: positionBuffer,
        numIndices: grid.lines.length,
    };

    return {
        solid: triangles,
        wireframe: wireframes
    };
}

// * https://jadkhoury.github.io/files/MasterThesisFinal.pdf
// * https://github.com/jadkhoury/TessellationDemo
function createQuadtreeData(maxLevel: number, elevationTexture: GPUTexture, earthTexture: GPUTexture, annotationTexture) {

    const device = app.wgpu.device;
    const computeShader = getQuadTreeComputeShader(64);

    // helper to create buffer for nodes
    // one buffer to write the indirect call + one buffer for the node
    const createDispatchBuffer = function (usage: number, label: string) {
        const buffer = device.createBuffer({
            label: label,
            size: 4 * Uint32Array.BYTES_PER_ELEMENT,
            usage: usage,
            mappedAtCreation: true,
        });
        const mappedBuffer = new Uint32Array(buffer.getMappedRange());
        mappedBuffer[0] = 1;
        mappedBuffer[1] = 1;
        mappedBuffer[2] = 1;
        mappedBuffer[3] = 2;
        buffer.unmap();
        return buffer;
    }

    const createNodeBuffer = function (numElements: number, usage: number, label: string) {

        const buffer = app.wgpu.device.createBuffer({
            label: label,
            size: QuadNodeSize * numElements,
            usage: usage,
            mappedAtCreation: true,
        });
        const mappedBuffer = new Uint32Array(buffer.getMappedRange());
        // look to QuadNodeSize for explanation
        // first quad
        mappedBuffer[0] = 1;
        mappedBuffer[1] = 0;
        // second quad
        mappedBuffer[2] = 1;
        mappedBuffer[3] = 1;
        for (let i = 4; i < mappedBuffer.length; i++) {
            mappedBuffer[i] = 0xffffffff;
        }
        buffer.unmap();
        return buffer;
    };

    const maxNodes = 1 << (2 * (maxLevel)) + 1;

    // create 2 instances to do pingpong
    const nodeBuffers: Array<PingPongComputeBuffer> = [{
        nodeBuffer: createNodeBuffer(maxNodes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, "bufferNodeA"),
        dispatchIndirect: createDispatchBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT, "drawIndirectA")
    },
    {
        nodeBuffer: createNodeBuffer(maxNodes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, "bufferNodeB"),
        dispatchIndirect: createDispatchBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT, "drawIndirectB")
    }];


    // this buffer is used for instance gometry
    // contains the node + index of the node
    const instanceBuffer: GPUBuffer = device.createBuffer({
        label: "instances",
        size: maxNodes * Uint32Array.BYTES_PER_ELEMENT * 2,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });

    // create buffer for the indirect draw call
    // for quads and wireframe ( 8 * 2)
    const drawIndirect = device.createBuffer({
        label: "drawIndirect(quads/wireframes)",
        size: 2 * 8 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT
    });

    // in KB
    const nodeBufferSize = (4 * maxNodes) / 1024;
    console.info(`init quadtree with ${maxNodes} nodes (${nodeBufferSize}KB)`);

    // buffer for data / uniform
    const quadTreeConfigBuffer = device.createBuffer({
        size: QuadTreeConfigSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: false,
    });

    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: computeShader,
            }),
            entryPoint: 'main',
        },
    });

    const bindGroupLayout = computePipeline.getBindGroupLayout(0);
    const createBindGroup = function (
        previousNodeBuffer: GPUBuffer,
        previousDispatchIndirect: GPUBuffer,
        outputNodeBuffer: GPUBuffer,
        outputDispatchIndirect: GPUBuffer,
        uniform: GPUBuffer,
        instanceBuffer: GPUBuffer,
        drawIndirect: GPUBuffer
    ) {
        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: previousNodeBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: previousDispatchIndirect
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: outputNodeBuffer
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: outputDispatchIndirect
                }
            },
            {
                binding: 4,
                resource: {
                    buffer: uniform
                }
            },
            {
                binding: 5,
                resource: {
                    buffer: instanceBuffer
                }
            },
            {
                binding: 6,
                resource: {
                    buffer: drawIndirect
                }
            }
            ]
        });
        return bindGroup;
    };
    const computeBindGroups = [
        createBindGroup(nodeBuffers[0].nodeBuffer, nodeBuffers[0].dispatchIndirect, nodeBuffers[1].nodeBuffer, nodeBuffers[1].dispatchIndirect, quadTreeConfigBuffer, instanceBuffer, drawIndirect),
        createBindGroup(nodeBuffers[1].nodeBuffer, nodeBuffers[1].dispatchIndirect, nodeBuffers[0].nodeBuffer, nodeBuffers[0].dispatchIndirect, quadTreeConfigBuffer, instanceBuffer, drawIndirect)
    ];

    // sampler for
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });



    const createRenderGeometry = function (primitive: GPUPrimitiveTopology, shaderModule: GPUShaderModule): RenderGeometry {
        const pipeline = app.wgpu.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [{
                    arrayStride: 16,
                    attributes: [{
                        shaderLocation: 0,
                        format: "float32x4",
                        offset: 0
                    } as GPUVertexAttribute]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: primitive,
                cullMode: 'back',
                frontFace: 'ccw'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        const layout = pipeline.getBindGroupLayout(0);
        const bindGroup = app.wgpu.device.createBindGroup({
            layout: layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: instanceBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: quadTreeConfigBuffer,
                    },
                },
                {
                    binding: 2,
                    resource: sampler
                },
                {
                    binding: 3,
                    resource: elevationTexture.createView()
                },
                {
                    binding: 4,
                    resource: earthTexture.createView()
                }
            ]
        });

        return {
            pipeline: pipeline,
            bindGroup: bindGroup
        };
    };

    const geometry1: RenderGeometry = createQuadGeometry(Grid1);
    const geometry4: RenderGeometry = createQuadGeometry(Grid4);

    // create one pipeline for solid and wireframe
    const drawQuadPipeline = createRenderGeometry("triangle-list", app.wgpu.device.createShaderModule({
        code: "const COLOR_FACTOR : f32 = 1.0;\n" + NodeFunctions + DrawShader
    }));
    const drawWireframePipeline = createRenderGeometry("line-list", app.wgpu.device.createShaderModule({
        code: "const COLOR_FACTOR : f32 = 0.1;\n" + NodeFunctions + DrawShader
    }));

    const createQuery = function (capacity: number) {
        if (!app.wgpu.hasQueryTimer) {
            return {
                capacity: 0,
                counters: null,
                querySet: null,
                labelMap: new Map<String, number>(),
                index: 0
            };
        }

        const querySet = device.createQuerySet({
            type: "timestamp",
            count: capacity,
        });
        const queryBuffer = device.createBuffer({
            size: 8 * capacity,
            usage: GPUBufferUsage.QUERY_RESOLVE
                | GPUBufferUsage.STORAGE
                | GPUBufferUsage.COPY_SRC
                | GPUBufferUsage.COPY_DST,
        });

        return {
            capacity: capacity,
            counters: queryBuffer,
            querySet: querySet,
            labelMap: new Map<String, number>(),
            index: 0
        }
    }

    // I wanted to test implement annotation on the globe but it will be for another time
    // const annotations = createAnnotations(quadTreeConfigBuffer, annotationTexture);

    const quadTree: QuadTree = {
        frame: 0,
        maxNodes: maxNodes,
        nodeBuffers: nodeBuffers,
        computeBindGroups: computeBindGroups,
        computePipeline: computePipeline,
        drawIndirect: drawIndirect,
        instanceBuffer: instanceBuffer,
        gridGeometries: [geometry1, geometry4],
        renderQuad: drawQuadPipeline,
        renderWireframe: drawWireframePipeline,
        configBuffer: quadTreeConfigBuffer,
        annotations: null,
        config: {
            projectionMatrix: null,
            modelMatrix: null,
            cameraPosition: null,
            projectToEarth: true,
            evaluateLodIn3D: false,
            evaluateRealCamera: false,
            displayTexture: 0,
            elevationScale: 1.0,
            lodScaleFactor: 2.0,
        },
        depthTexture: null,
        query: createQuery(4),
    };

    return quadTree;
}

function initUpdate(pingPongBuffer: QuadTree) {
    pingPongBuffer.query.index = 0;
}

function updateDataBuffer(config: QuadTreeConfig, buffer: GPUBuffer) {

    // need to try shader reflexion when I will have time
    // https://brendan-duncan.github.io/wgsl_reflect/example.html
    const endianness = true;
    let tmpBuffer = new ArrayBuffer(QuadTreeConfigSize);
    let tmpView = new DataView(tmpBuffer);

    // see https://vscode.dev/github/cedricpinson/webgpu-experiment/blob/8b10d67ee4addc918006c7360e0f9667f8c04d60/src/quadtree-types.ts#L46
    let offset = 0;
    for (let i = 0; i < 16; i++) {
        tmpView.setFloat32(offset, config.projectionMatrix[i], endianness);
        offset += 4;
    }
    for (let i = 0; i < 16; i++) {
        tmpView.setFloat32(offset, config.modelMatrix[i], endianness);
        offset += 4;
    }
    for (let i = 0; i < 4; i++) {
        tmpView.setFloat32(offset, config.cameraPosition[i], endianness);
        offset += 4;
    }

    tmpView.setUint32(offset + 0, config.projectToEarth == true ? 1 : 0, endianness);
    tmpView.setUint32(offset + 4, config.evaluateLodIn3D == true ? 1 : 0, endianness);
    tmpView.setUint32(offset + 8, config.displayTexture, endianness);
    tmpView.setFloat32(offset + 12, config.elevationScale, endianness);
    tmpView.setUint32(offset + 16, config.evaluateRealCamera == true ? 1 : 0, endianness);
    tmpView.setFloat32(offset + 20, config.lodScaleFactor, endianness);

    app.wgpu.device.queue.writeBuffer(buffer, 0, tmpView, 0, QuadTreeConfigSize);
}

async function updateQuadTree(pingPongBuffer: QuadTree) {

    const device = app.wgpu.device;

    app.config.frameNumber = pingPongBuffer.frame;
    const index = pingPongBuffer.frame;
    pingPongBuffer.frame += 1;

    // data set from the application
    updateDataBuffer(pingPongBuffer.config, pingPongBuffer.configBuffer);

    // reset the count of the next buffer to write the new node results
    app.wgpu.device.queue.writeBuffer(pingPongBuffer.nodeBuffers[(index + 1) % 2].dispatchIndirect, 0, new Uint32Array([0, 1, 1, 0]));

    const geometry = pingPongBuffer.gridGeometries[app.config.gridResolution];

    // reset the drawIndirect buffer
    app.wgpu.device.queue.writeBuffer(pingPongBuffer.drawIndirect, 0, new Uint32Array([
        geometry.solid.numIndices, 0, 0, 0, 0, 0, 0, 0,
        app.config.wireframe === true ? geometry.wireframe.numIndices : 0, 0, 0, 0, 0, 0, 0, 0,
    ]));

    const commandEncoder = device.createCommandEncoder();

    let timestamps = {};
    if (app.wgpu.hasQueryTimer) {

        const queryStartIndex = timestamp(pingPongBuffer.query, 'updateStart');
        const queryEndIndex = timestamp(pingPongBuffer.query, 'updateEnd');
        timestamps = {
            timestampWrites: {
                querySet: pingPongBuffer.query.querySet,
                beginningOfPassWriteIndex: queryStartIndex,
                endOfPassWriteIndex: queryEndIndex,
            }
        }

    }

    const pass = commandEncoder.beginComputePass(timestamps);

    pass.setPipeline(pingPongBuffer.computePipeline);

    // bind groups
    pass.setBindGroup(0, pingPongBuffer.computeBindGroups[index % 2]);
    pass.dispatchWorkgroupsIndirect(pingPongBuffer.nodeBuffers[index % 2].dispatchIndirect, 0);
    pass.end();

    let debugBuffers: Array<GPUBuffer> = null;
    if (app.config.debugBuffers) {
        debugBuffers = addDebugComputeCommands(commandEncoder, pingPongBuffer, index % 2, (index + 1) % 2);
    }

    device.queue.submit([commandEncoder.finish()]);

    if (debugBuffers) {
        dumpDebugComputeData(debugBuffers, pingPongBuffer.maxNodes, app.config.frameNumber);
    }

    return true;
}

function getRendePassDesc(quadTree: QuadTree) {
    const colorView = app.wgpu.context.getCurrentTexture().createView();

    // create / update depthTexture
    if (quadTree.depthTexture == null ||
        quadTree.depthTexture.width !== app.wgpu.context.getCurrentTexture().width ||
        quadTree.depthTexture.height !== app.wgpu.context.getCurrentTexture().height
    ) {

        const depthTextureDesc: GPUTextureDescriptor = {
            size: [app.wgpu.context.getCurrentTexture().width, app.wgpu.context.getCurrentTexture().height, 1],
            dimension: '2d',
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        };

        if (quadTree.depthTexture) {
            quadTree.depthTexture.destroy();
        }

        quadTree.depthTexture = app.wgpu.device.createTexture(depthTextureDesc);
    }

    let depthView = quadTree.depthTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
        view: colorView,
        clearValue: [0, 0, 0, 1],
        loadOp: 'clear',
        storeOp: 'store',
    };
    const depthAttachment: GPURenderPassDepthStencilAttachment = {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
    };

    const renderPassDesc: GPURenderPassDescriptor = {
        colorAttachments: [colorAttachment],
        depthStencilAttachment: depthAttachment
    };

    return renderPassDesc;
}

async function renderQuads(pingPongBuffer: QuadTree) {

    const commandEncoder = app.wgpu.device.createCommandEncoder();

    const index = pingPongBuffer.frame;

    let renderPassDesc = getRendePassDesc(pingPongBuffer);

    if (app.wgpu.hasQueryTimer) {

        const timestampsStart = timestamp(pingPongBuffer.query, "renderStart");
        const timestampsEnd = timestamp(pingPongBuffer.query, "renderEnd");

        let timestamps = {
            querySet: pingPongBuffer.query.querySet,
            beginningOfPassWriteIndex: timestampsStart,
            endOfPassWriteIndex: timestampsEnd
        };

        renderPassDesc['timestampWrites'] = timestamps;
    }
    const pass = commandEncoder.beginRenderPass(renderPassDesc);
    const geometry = pingPongBuffer.gridGeometries[app.config.gridResolution];

    // solid
    if (true) {
        pass.setPipeline(pingPongBuffer.renderQuad.pipeline);
        pass.setVertexBuffer(0, geometry.solid.position);
        pass.setIndexBuffer(geometry.solid.index, 'uint16', 0);
        pass.setBindGroup(0, pingPongBuffer.renderQuad.bindGroup);
        pass.drawIndexedIndirect(pingPongBuffer.drawIndirect, 0);

        // wireframe
        pass.setPipeline(pingPongBuffer.renderWireframe.pipeline);
        pass.setVertexBuffer(0, geometry.wireframe.position);
        pass.setIndexBuffer(geometry.wireframe.index, 'uint16', 0);
        pass.setBindGroup(0, pingPongBuffer.renderWireframe.bindGroup);
        pass.drawIndexedIndirect(pingPongBuffer.drawIndirect, 8 * 4);
    }

    if (false) {
        // annotations
        pass.setPipeline(pingPongBuffer.annotations.renderAnnotation.pipeline);
        // use single quad instance
        const annotationGeometry = pingPongBuffer.gridGeometries[0];
        pass.setVertexBuffer(0, annotationGeometry.solid.position);
        pass.setIndexBuffer(annotationGeometry.solid.index, 'uint16', 0);
        pass.setBindGroup(0, pingPongBuffer.annotations.renderAnnotation.bindGroup);
        pass.drawIndexed(annotationGeometry.solid.numIndices, pingPongBuffer.annotations.numAnnotation);
    }

    pass.end();

    // debug code
    let debugBuffer: GPUBuffer = null;
    if (app.config.debugBuffers) {
        //debugBuffer = addDebugRenderCommands(commandEncoder, pingPongBuffer.vertexBuffer, pingPongBuffer.drawIndirect);
    }

    if (app.wgpu.hasQueryTimer) {
        commandEncoder.resolveQuerySet(
            pingPongBuffer.query.querySet,
            0,// index of first query to resolve
            pingPongBuffer.query.capacity,//number of queries to resolve
            pingPongBuffer.query.counters,
            0);// destination offset
    }

    app.wgpu.device.queue.submit([commandEncoder.finish()]);

    if (debugBuffer) {
        dumpDebugRenderData(debugBuffer, app.config.frameNumber);
    }
    app.config.debugBuffers = false;

    if (app.wgpu.hasQueryTimer) {
        // get counter back
        const bufferRead = readBuffer(app.wgpu.device, pingPongBuffer.query.counters);
        await bufferRead.mapAsync(GPUMapMode.READ);
        const arrayBuffer = bufferRead.getMappedRange();
        // Decode it into an array of timestamps in nanoseconds
        const timingsNanoseconds = new BigInt64Array(arrayBuffer);
        const timeUpdateQuadTreeInMS = Number(timingsNanoseconds[pingPongBuffer.query.labelMap.get('updateEnd')] - timingsNanoseconds[pingPongBuffer.query.labelMap.get('updateStart')]) / 1_000_000;
        const timeRenderQuadTreeInMS = Number(timingsNanoseconds[pingPongBuffer.query.labelMap.get('renderEnd')] - timingsNanoseconds[pingPongBuffer.query.labelMap.get('renderStart')]) / 1_000_000;

        bufferRead.unmap();
        bufferRead.destroy();

        app.config.updateQuadTree = timeUpdateQuadTreeInMS;
        app.config.renderQuadTree = timeRenderQuadTreeInMS;
    }


    return true;
}

function initQuadTree(elevationTexture: GPUTexture, earthTexture: GPUTexture, annotationTexture: GPUTexture) {
    const quadTreeData: QuadTree = createQuadtreeData(app.config.maxLod, elevationTexture, earthTexture, annotationTexture);

    return {
        quadTreeData: quadTreeData,
        initUpdate: initUpdate,
        updateQuadTree: updateQuadTree,
        renderQuadTree: renderQuads
    };
}


export { initQuadTree, QuadTreeFunctions }