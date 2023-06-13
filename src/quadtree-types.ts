import { mat4, vec4 } from "gl-matrix"

// a node is:
// u32 , u32
// node, index
const QuadNodeSize = Uint32Array.BYTES_PER_ELEMENT * 2;

interface PingPongComputeBuffer {
    nodeBuffer: GPUBuffer
    dispatchIndirect: GPUBuffer
}

interface QuadTreeFunctions {
    quadTreeData: QuadTree
    initUpdate: Function
    updateQuadTree: Function
    renderQuadTree: Function
}

interface QueryCounter {
    capacity: number
    counters: GPUBuffer
    querySet: GPUQuerySet
    index: number
    labelMap: Map<String, number>
}

interface IndexedGeometry {
    position: GPUBuffer
    index: GPUBuffer
    numIndices: number
}

interface SolidWireframeGeometry {
    solid: IndexedGeometry
    wireframe: IndexedGeometry
}

interface RenderGeometry {
    pipeline: GPURenderPipeline
    bindGroup: GPUBindGroup
}

// webgpu minimum binding is 16 bytes
const QuadTreeConfigSize = Math.max(Uint32Array.BYTES_PER_ELEMENT * (16*2 +4 + 7), 176);
interface QuadTreeConfig {
    projectionMatrix: mat4
    modelMatrix: mat4
    cameraPosition: vec4
    projectToEarth: boolean
    evaluateLodIn3D: boolean
    evaluateRealCamera: boolean
    displayTexture: number
    elevationScale: number
    lodScaleFactor: number
}

interface Annotation {
    annotationBuffer: GPUBuffer
    annotationTexture: GPUTexture
    renderAnnotation: RenderGeometry
    annotation: any
    numAnnotation: number
}

interface QuadTree {
    frame: number,
    maxNodes: number,
    nodeBuffers: Array<PingPongComputeBuffer>
    computeBindGroups: Array<GPUBindGroup>
    computePipeline: GPUComputePipeline
    drawIndirect: GPUBuffer
    instanceBuffer: GPUBuffer
    gridGeometries: Array<SolidWireframeGeometry>
    renderQuad: RenderGeometry
    renderWireframe: RenderGeometry
    depthTexture: GPUTexture
    configBuffer: GPUBuffer
    config: QuadTreeConfig
    query: QueryCounter,
    annotations: Annotation
}

interface GridGeometry {
    vertices: Array<number>
    lines: Array<number>
    triangles: Array<number>
}

// 2 +-+-+     // 2 5 8
// 1 +-+-+     // 1 4 7
// 0 +-+-+     // 0 3 6
// triangles: [
//     0, 1, 4,
//     0, 4, 3,
//     1, 2, 5,
//     1, 5, 4,

//     3, 4, 7,
//     3, 7, 6,
//     4, 5, 8,
//     4, 8, 7,
// ],
// triangles: [
//     0, 4, 1,
//     0, 3, 4,
//     1, 5, 2,
//     1, 4, 5,

//     3, 7, 4,
//     3, 6, 7,
//     4, 8, 5,
//     4, 7, 8,
// ],
const Grid4: GridGeometry = {
    vertices: [
        0.0, 0.0, 0.0, 0.0,
        0.0, 0.5, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.5, 0.0, 1.0, 0.0,
        0.5, 0.5, 1.0, 1.0,
        0.5, 1.0, 1.0, 1.0,
        1.0, 0.0, 1.0, 0.0,
        1.0, 0.5, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
    ],
    triangles: [
        0, 4, 1,
        0, 3, 4,
        1, 5, 2,
        1, 4, 5,

        3, 7, 4,
        3, 6, 7,
        4, 8, 5,
        4, 7, 8,
    ],
    lines: [
        0, 1,
        1, 2,
        2, 5,
        5, 8,
        8, 7,
        7, 6,
        6, 3,
        3, 0,

        0, 4,
        1, 5,
        4, 8,
        3, 7,

        1, 4,
        5, 4,
        7, 4,
        3, 4,
    ]
};

// 1 +-+     // 1 2
// 0 +-+     // 0 3
const Grid1: GridGeometry = {
    vertices: [
        0.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 0.0, 1.0, 0.0
    ],
    triangles: [
        0, 2, 1,
        0, 3, 2
    ],
    lines: [
        0, 1,
        1, 2,
        2, 0,
        2, 3,
        3, 0
    ]
};

export { QuadTree, QuadTreeFunctions, QuadTreeConfig, PingPongComputeBuffer, QueryCounter, IndexedGeometry, RenderGeometry, QuadTreeConfigSize, QuadNodeSize, GridGeometry, Grid1, Grid4 };