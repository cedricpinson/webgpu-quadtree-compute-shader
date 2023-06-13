// const COLOR_FACTOR : f32 = 1.0;

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color          : vec4<f32>,
    @location(1) uv             : vec2<f32>,
    @location(2) pos2d          : vec2<f32>,
};

// https://lospec.com/palette-list/resurrect-64
const colorTable64 = array< vec4<f32>, 64> (
    vec4<f32>(46/255.0, 34/255.0, 47/255.0, 1.0),
    vec4<f32>(62/255.0, 53/255.0, 70/255.0, 1.0),
    vec4<f32>(98/255.0, 85/255.0, 101/255.0, 1.0),
    vec4<f32>(150/255.0, 108/255.0, 108/255.0, 1.0),
    vec4<f32>(171/255.0, 148/255.0, 122/255.0, 1.0),
    vec4<f32>(105/255.0, 79/255.0, 98/255.0, 1.0),
    vec4<f32>(127/255.0, 112/255.0, 138/255.0, 1.0),
    vec4<f32>(155/255.0, 171/255.0, 178/255.0, 1.0),
    vec4<f32>(199/255.0, 220/255.0, 208/255.0, 1.0),
    vec4<f32>(255/255.0, 255/255.0, 255/255.0, 1.0),
    vec4<f32>(110/255.0, 39/255.0, 39/255.0, 1.0),
    vec4<f32>(179/255.0, 56/255.0, 49/255.0, 1.0),
    vec4<f32>(234/255.0, 79/255.0, 54/255.0, 1.0),
    vec4<f32>(245/255.0, 125/255.0, 74/255.0, 1.0),
    vec4<f32>(174/255.0, 35/255.0, 52/255.0, 1.0),
    vec4<f32>(232/255.0, 59/255.0, 59/255.0, 1.0),
    vec4<f32>(251/255.0, 107/255.0, 29/255.0, 1.0),
    vec4<f32>(247/255.0, 150/255.0, 23/255.0, 1.0),
    vec4<f32>(249/255.0, 194/255.0, 43/255.0, 1.0),
    vec4<f32>(122/255.0, 48/255.0, 69/255.0, 1.0),
    vec4<f32>(158/255.0, 69/255.0, 57/255.0, 1.0),
    vec4<f32>(205/255.0, 104/255.0, 61/255.0, 1.0),
    vec4<f32>(230/255.0, 144/255.0, 78/255.0, 1.0),
    vec4<f32>(251/255.0, 185/255.0, 84/255.0, 1.0),
    vec4<f32>(76/255.0, 62/255.0, 36/255.0, 1.0),
    vec4<f32>(103/255.0, 102/255.0, 51/255.0, 1.0),
    vec4<f32>(162/255.0, 169/255.0, 71/255.0, 1.0),
    vec4<f32>(213/255.0, 224/255.0, 75/255.0, 1.0),
    vec4<f32>(251/255.0, 255/255.0, 134/255.0, 1.0),
    vec4<f32>(22/255.0, 90/255.0, 76/255.0, 1.0),
    vec4<f32>(35/255.0, 144/255.0, 99/255.0, 1.0),
    vec4<f32>(30/255.0, 188/255.0, 115/255.0, 1.0),
    vec4<f32>(145/255.0, 219/255.0, 105/255.0, 1.0),
    vec4<f32>(205/255.0, 223/255.0, 108/255.0, 1.0),
    vec4<f32>(49/255.0, 54/255.0, 56/255.0, 1.0),
    vec4<f32>(55/255.0, 78/255.0, 74/255.0, 1.0),
    vec4<f32>(84/255.0, 126/255.0, 100/255.0, 1.0),
    vec4<f32>(146/255.0, 169/255.0, 132/255.0, 1.0),
    vec4<f32>(178/255.0, 186/255.0, 144/255.0, 1.0),
    vec4<f32>(11/255.0, 94/255.0, 101/255.0, 1.0),
    vec4<f32>(11/255.0, 138/255.0, 143/255.0, 1.0),
    vec4<f32>(14/255.0, 175/255.0, 155/255.0, 1.0),
    vec4<f32>(48/255.0, 225/255.0, 185/255.0, 1.0),
    vec4<f32>(143/255.0, 248/255.0, 226/255.0, 1.0),
    vec4<f32>(50/255.0, 51/255.0, 83/255.0, 1.0),
    vec4<f32>(72/255.0, 74/255.0, 119/255.0, 1.0),
    vec4<f32>(77/255.0, 101/255.0, 180/255.0, 1.0),
    vec4<f32>(77/255.0, 155/255.0, 230/255.0, 1.0),
    vec4<f32>(143/255.0, 211/255.0, 255/255.0, 1.0),
    vec4<f32>(69/255.0, 41/255.0, 63/255.0, 1.0),
    vec4<f32>(107/255.0, 62/255.0, 117/255.0, 1.0),
    vec4<f32>(144/255.0, 94/255.0, 169/255.0, 1.0),
    vec4<f32>(168/255.0, 132/255.0, 243/255.0, 1.0),
    vec4<f32>(234/255.0, 173/255.0, 237/255.0, 1.0),
    vec4<f32>(117/255.0, 60/255.0, 84/255.0, 1.0),
    vec4<f32>(162/255.0, 75/255.0, 111/255.0, 1.0),
    vec4<f32>(207/255.0, 101/255.0, 127/255.0, 1.0),
    vec4<f32>(237/255.0, 128/255.0, 153/255.0, 1.0),
    vec4<f32>(131/255.0, 28/255.0, 93/255.0, 1.0),
    vec4<f32>(195/255.0, 36/255.0, 84/255.0, 1.0),
    vec4<f32>(240/255.0, 79/255.0, 120/255.0, 1.0),
    vec4<f32>(246/255.0, 129/255.0, 129/255.0, 1.0),
    vec4<f32>(252/255.0, 167/255.0, 144/255.0, 1.0),
    vec4<f32>(253/255.0, 203/255.0, 176/255.0, 1.0)
);


@group(0) @binding(0) var<storage, read> instances: array<Node>;
@group(0) @binding(1) var<uniform> config: Config;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var elevationTexture: texture_2d<f32>;
@group(0) @binding(4) var earthTexture: texture_2d<f32>;

// compute vertex morphed in the grid space [0-1]
fn computeVertexMorph(nodeMeta: NodeMeta, gridVertex: vec4<f32>) -> vec2<f32> {

    // evaluate distance of the vertex relative to the node
    var dist = 0.0;
    let positionInGrid = gridVertex.xy * vec2<f32>(nodeMeta.size) + nodeMeta.corner.xy + nodeMeta.offset;
    let cameraPosition = config.cameraPosition;
    if (config.evaluateLodIn3D == 1) {
        let nodePosition = convertLatLongTo3D(toLatLong(positionInGrid));
        if (config.evaluateRealCamera == 1) {
            dist = distance(cameraPosition.xyz, nodePosition);
        }  else {
            let position = convertLatLongTo3D(toLatLong(cameraPosition.xy));
            dist = distance(position, nodePosition);
        }
    } else {
        dist = distance(cameraPosition.xy, positionInGrid);
    }

    let morph = computeMorphFactor(dist, nodeMeta);

    // temporary for debugging LOD on earth size model
    // let morph = 0.0;
    return mix(gridVertex.xy, gridVertex.zw, vec2<f32>(morph));
}

@vertex
fn vertex_main(@location(0) vertex: vec4<f32>,
               @builtin(instance_index) instanceIndex: u32 ) -> VertexOut
{
    var output : VertexOut;

    let node = instances[instanceIndex].node;
    let nodeData = instances[instanceIndex].nodeData;

    let quadData = getQuadData(node);
    let quadLevel = quadData.z;

    // we use 2 quads to create a panorama
    // nodeData = 0 for the 1st
    // nodeData = 1 for the 2nd
    var quadOffset = vec2<f32>( f32(nodeData & 1), 0.0);

    let nodeMeta = extractNodeData(instances[instanceIndex]);
    let pos = ( computeVertexMorph(nodeMeta, vertex) + vec2<f32>(quadData.xy) ) * computeNodeSize(quadData.z) + quadOffset;

    let uv = vec2<f32>(pos.xy[0] * 0.5, 1.0-pos.xy[1]);
    let elevation = config.elevationScale * textureSampleLevel(elevationTexture, textureSampler, uv, 0).r;

    if (config.projectToEarth == 1) {
        let posProjected = convertLatLongTo3D(toLatLongAlt(pos, elevation * 9000.0));
        output.position = config.projectionMatrix * (config.modelMatrix * vec4<f32>(posProjected,1.0));
    } else {
        output.position = config.projectionMatrix * (config.modelMatrix * vec4<f32>(pos.xy, 0.0,1.0));
    }

    output.pos2d = pos;
    output.uv = uv;

    // COLOR_FACTOR change when drawing wireframe
    if (COLOR_FACTOR < 1.0) { // to avoid z fithing on the wireframe
        if (config.projectToEarth == 1) {
            output.position.z -= output.position.z * 0.2;
        } else {
            output.position.z -= 0.0001;
        }
    }
    // output.color = colorTable64[quadLevel%64];
    output.color = colorTable64[(quadLevel + 32 * (nodeData & 1))%64];
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{

    var data : vec4<f32>;
    if (config.displayTexture == 0) {
        data = textureSample(earthTexture, textureSampler, fragData.uv);
    } else if (config.displayTexture == 1) {
        data = vec4<f32>(textureSample(elevationTexture, textureSampler, fragData.uv).r);
    } else {
        data = fragData.color;
    }

    if (config.evaluateRealCamera == 0 && distance(fragData.pos2d, config.cameraPosition.xy) < 0.0005 ) {
        return vec4(1.0,0.0,1.0,1.0);
    }

    var color : vec4<f32>;
    if (COLOR_FACTOR < 1.0) {
        color = (data + vec4<f32>(1.0,1.0,0.0,1.0)) * 1.0/3.0;
    } else {
        color = data;
    }
    return color;
}
