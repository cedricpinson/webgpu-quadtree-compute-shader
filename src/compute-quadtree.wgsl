
// this is injected by JS
// const WORKGROUP_BIT_SHIFT : u32 = WORKGROUP_BIT_SHIFT_VALUE;
// const WORKGROUP_SIZE : u32 = WORKGROUP_SIZE_VALUE;

struct IndirectDrawCall {
    indexCount: u32,
    instanceCount: atomic<u32>,
    firstIndex: u32,
    baseVertex: u32,
    firstInstance: u32,
    padding0: u32,
    padding1: u32,
    padding2: u32
};

struct IndirectDraw {
    quads: IndirectDrawCall,
    wireframes: IndirectDrawCall
};

struct IndirectDispatch {
    x: atomic<u32>,
    y: atomic<u32>,
    z: atomic<u32>,
    count: atomic<u32>,
};

struct PreviousDispatch {
    x: u32,
    y: u32,
    z: u32,
    count: u32,
};

@group(0) @binding(0) var<storage, read> inputNodes : array<Node>;
@group(0) @binding(1) var<storage, read> previousIndirect : PreviousDispatch;
@group(0) @binding(2) var<storage, read_write> outputNodes : array<Node>;
@group(0) @binding(3) var<storage, read_write> outputIndirect : IndirectDispatch;
@group(0) @binding(4) var<uniform> config : Config;

@group(0) @binding(5) var<storage, read_write>  instanceBuffer : array<Node>;
@group(0) @binding(6) var<storage, read_write>  indirectDraw : IndirectDraw;

fn addInstance(node: u32, nodeData: u32, instanceIndex: u32) {
    instanceBuffer[instanceIndex].node = node;
    instanceBuffer[instanceIndex].nodeData = nodeData;
}


fn addChildren(nodeIndex: u32) {
    var index : u32 = atomicAdd(&outputIndirect.count, 4u);
    // if we have a workgroup of 8 and we have a count of 10
    // we need 2 dispatch. to do this simply we divide by 4 and add 1
    atomicMax(&outputIndirect.x, ( (index + 4) >> WORKGROUP_BIT_SHIFT ) + 1);
    let children = getChildren(inputNodes[nodeIndex].node);

    // copy & generate quads
    // TODO add culling on the draw quad buffer
    let instanceIndex = atomicAdd(&indirectDraw.quads.instanceCount, 4u);
    atomicAdd(&indirectDraw.wireframes.instanceCount, 4u);
    for (var i : u32 = 0; i < 4; i++) {
        outputNodes[index + i].node = children[i];
        outputNodes[index + i].nodeData = inputNodes[nodeIndex].nodeData;
        addInstance(children[i], inputNodes[nodeIndex].nodeData, instanceIndex + i);
    }
}

fn addParentNode(nodeIndex: u32) {
    let node = getParent(inputNodes[nodeIndex].node);

    let index = atomicAdd(&outputIndirect.count, 1u);
    atomicMax(&outputIndirect.x, ( (index + 1) >> WORKGROUP_BIT_SHIFT ) + 1);

    outputNodes[index].node = node;
    outputNodes[index].nodeData = inputNodes[nodeIndex].nodeData;

    // TODO add culling on the draw quad buffer
    atomicAdd(&indirectDraw.wireframes.instanceCount, 1u);
    let instanceIndex = atomicAdd(&indirectDraw.quads.instanceCount, 1u);
    addInstance(node, inputNodes[nodeIndex].nodeData, instanceIndex);
}

fn copyNode(nodeIndex: u32) {

    let index = atomicAdd(&outputIndirect.count, 1u);
    atomicMax(&outputIndirect.x, ( (index + 1) >> WORKGROUP_BIT_SHIFT ) + 1);

    let node = inputNodes[nodeIndex].node;
    outputNodes[index].node = node;
    outputNodes[index].nodeData = inputNodes[nodeIndex].nodeData;

    // TODO add culling on the draw quad buffer
    atomicAdd(&indirectDraw.wireframes.instanceCount, 1u);
    let instanceIndex = atomicAdd(&indirectDraw.quads.instanceCount, 1u);
    addInstance(node, inputNodes[nodeIndex].nodeData, instanceIndex);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    let nodeIndex : u32 = GlobalInvocationID.x;

    let maxNodes = previousIndirect.count;
    if (nodeIndex >= maxNodes) {
        return;
    }

    let node = inputNodes[nodeIndex].node;
    let parent = getParent(node);

    let currentNodeMeta = extractNodeData(inputNodes[nodeIndex]);
    let nodeSize = currentNodeMeta.size;
    let nodeLevel = currentNodeMeta.level;

    let parentNodeMeta = extractNodeData(Node(parent, inputNodes[nodeIndex].nodeData));
    let parentSize = parentNodeMeta.size;


    var position = config.cameraPosition.xyz;
    if (config.evaluateLodIn3D == 1 && config.evaluateRealCamera == 0) {
        position = convertLatLongTo3D(toLatLong(position.xy));
    }

    let nodeFactor = scaleFactor(nodeDistance(position.xyz, currentNodeMeta));
    let parentFactor = scaleFactor(nodeDistance(position.xyz, parentNodeMeta));

    if ( NodeK * nodeSize >= nodeFactor && nodeLevel < NodeMaxLevel) {
        addChildren(nodeIndex);
    } else if ( NodeK * parentSize < parentFactor && nodeLevel != 0) {
        if (isChildZeroKey(node)) {
            addParentNode(nodeIndex);
        }
    } else {
        copyNode(nodeIndex);
    }
}
