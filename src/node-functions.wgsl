
const NodeMaxLevel = 14;

 // extending this number helps to expand the zone for a LOD when evaluating
 // distance in 3D
const NodeK = 16;

const EarthRadius = 6378137.0;                     // Radius of the Earth (in meters)
const PI = 3.14159265359;

struct Node {
    node: u32,
    nodeData: u32
};

struct Config {
    projectionMatrix: mat4x4<f32>,
    modelMatrix: mat4x4<f32>,
    cameraPosition: vec4<f32>,
    projectToEarth: u32,
    evaluateLodIn3D: u32,
    displayTexture: u32,
    elevationScale: f32,
    evaluateRealCamera: u32,
    lodScaleFactor: f32,
};


fn undilate(v : u32) -> u32 {
    var x = v;
    x = ( x | ( x >> 1)) & 0x33333333;
    x = ( x | ( x >> 2)) & 0x0f0f0f0f;
    x = ( x | ( x >> 4)) & 0x00ff00ff;
    x = ( x | ( x >> 8)) & 0x0000ffff;
    return x & 0x0000ffff;
}

// return vec3
// x,y,level
// to compute real coordinate use others functions
fn getQuadData(node: u32) -> vec3<u32> {
    let leadingBit : u32 = firstLeadingBit(node);
    let level = leadingBit >> 1;
    let mask : u32 = ~(1u << leadingBit);
    let coordData = node & mask;
    // x and y are coord uint32 data
    // z is the size
    let xys = vec3<u32>( undilate( coordData & 0x55555555),
                         undilate( (coordData >> 1) & 0x55555555),
                         level );
    return xys;
}

fn computeNodeSize(level: u32) -> f32 {
    return 1.0/f32(1 << level);
}

fn computeNodeCenter(quadData: vec3<u32>) -> vec2<f32> {
    let size = computeNodeSize(quadData.z);
    let corner = vec2<f32>(quadData.xy) * vec2<f32>(size);
    return (vec2<f32>(quadData.xy) + vec2<f32>(0.5)) * vec2<f32>(size);
}

fn isChildZeroKey(node: u32) -> bool {
    return (node & 3) == 0;
}

fn getChildren(node: u32) -> vec4<u32> {
    let k = node << 2;
    return vec4<u32>(
        k,
        k | 0x1,
        k | 0x2,
        k | 0x3,
    );
}

fn getParent(node: u32) -> u32 {
    return node >> 2;

}

fn scaleFactor(z: f32) -> f32 {
    return config.lodScaleFactor*z;
    // s(z) = 2z tan ( α / 2 )
    const x = (PI * 0.5);
    let x2 = 2.0 * tan( x * 0.5 );
    // it means x2 = 2 for 90 fov
    return z * x2;
}

struct NodeMeta {
    node: u32,
    size: f32,
    level: u32,
    coord: vec2<u32>,
    corner: vec2<f32>,
    center: vec2<f32>,
    offset: vec2<f32>
};

fn extractNodeData(nodePacked: Node) -> NodeMeta {
    let leadingBit : u32 = firstLeadingBit(nodePacked.node);
    let level = leadingBit >> 1;
    let mask : u32 = ~(1u << leadingBit);
    let coordData = nodePacked.node & mask;
    // x and y are coord uint32 data
    // z is the size
    let xys = vec3<u32>( undilate( coordData & 0x55555555),
                         undilate( (coordData >> 1) & 0x55555555),
                         level );

    var nodeMeta : NodeMeta;
    nodeMeta.node = nodePacked.node;
    nodeMeta.level = level;
    nodeMeta.size = 1.0/f32(1 << level);
    nodeMeta.coord = vec2<u32>(undilate( coordData & 0x55555555),
                               undilate( (coordData >> 1) & 0x55555555));
    nodeMeta.offset = vec2<f32>( f32(nodePacked.nodeData & 1), 0.0);
    nodeMeta.corner = vec2<f32>(nodeMeta.coord.xy) * vec2<f32>(nodeMeta.size);
    nodeMeta.center = (vec2<f32>(nodeMeta.coord.xy) + vec2<f32>(0.5)) * vec2<f32>(nodeMeta.size);
    return nodeMeta;
}

// convert [0-2, 0-1] to lat/long
fn toLatLong(coord : vec2<f32>) -> vec3<f32> {
    return vec3<f32>( PI*(coord[1] - 0.5f), PI*(coord[0] - 1.0f), 0.0);
}

fn toRect(latLong : vec2<f32>) -> vec2<f32> {
    return vec2<f32>( (latLong[1]/PI + 1.0) % 2.0, (latLong[0]/PI + 0.5) % 1.0);
}

fn toLatLongAlt(coord : vec2<f32>, altitude: f32) -> vec3<f32> {
    return vec3<f32>( PI*(coord[1] - 0.5f), PI*(coord[0] - 1.0f), altitude);
}

fn convertLatLongTo3D(coord : vec3<f32>) -> vec3<f32>
{
    let latitude = coord[0];
    let longitude = coord[1];
    let altitude = coord[2];

    // const radius = 1.0;
    const radius = EarthRadius;                     // Radius of the Earth (in meters)
    const flatteningFactor = 1.0/298.257223563;   // Flattening factor WGS84 Model
    let cosLat = cos(latitude);
    let sinLat = sin(latitude);
    const FF = (1.0-flatteningFactor) * (1.0-flatteningFactor);
    let C = 1.0/sqrt(cosLat * cosLat + FF * sinLat * sinLat);
    let S = C * FF;

    // let x = (radius * C) * cosLat * cos(longitude);
    // let y = (radius * C) * cosLat * sin(longitude);
    // let z = (radius * S) * sinLat;

    // var sinLatitude = Math.sin(latitude);
    //     var cosLatitude = Math.cos(latitude);
    //     var N =
    //         this._radiusEquator /
    //         Math.sqrt(1.0 - this._eccentricitySquared * sinLatitude * sinLatitude);
    //     var X = (N + height) * cosLatitude * Math.cos(longitude);
    //     var Y = (N + height) * cosLatitude * Math.sin(longitude);
    //     var Z = (N * (1.0 - this._eccentricitySquared) + height) * sinLatitude;
    //     result[0] = X;
    //     result[1] = Y;
    //     result[2] = Z;
    let cosLong = cos(longitude);
    let sinLong = sin(longitude);
    let radiusAlt = radius + altitude;
    let x = radiusAlt * cosLat * cosLong;
    let y = radiusAlt * cosLat * sinLong;
    let z = radiusAlt * sinLat;

    return vec3<f32>(x,y,z);
}

fn nodeDistancePlannar(position: vec3<f32>, nodeMeta: NodeMeta) -> f32 {
    let nodePos = nodeMeta.center.xy + nodeMeta.offset;

    // handle the wrap on longitude
    let distance0 = distance(position.xy, nodePos);
    let distance1 = distance(position.xy + vec2<f32>(2.0,0.0), nodePos);
    let distance2 = distance(position.xy - vec2<f32>(2.0,0.0), nodePos);
    return min(min(distance0, distance1), distance2);
}

fn nodeDistance3D(position: vec3<f32>, nodeMeta: NodeMeta) -> f32 {
    let nodePos = nodeMeta.center.xy + nodeMeta.offset;
    let latLong = toLatLong(nodePos);
    let pos3d = convertLatLongTo3D(latLong);

    // handle the wrap on longitude
    let distance0 = distance(position.xyz, pos3d);
    return distance0;
}

fn nodeDistance(position: vec3<f32>, nodeMeta: NodeMeta) -> f32 {

    if (config.evaluateLodIn3D == 1) {
        return nodeDistance3D(position, nodeMeta);
    }
    return nodeDistancePlannar(position, nodeMeta);
}

fn computeMorphFactor(distance: f32, nodeMeta: NodeMeta) -> f32 {
    let parentSize = nodeMeta.size * 2.0;
    let size = NodeK * parentSize;
    let sdist = scaleFactor(distance);
    let factor = sdist / size;

    // I evaluated the formula on https://www.desmos.com/calculator/rsztz4sxnp
    // the idea is to start to morph not at the beggining and not stopping at the end.
    // I could re evaluate to window of interpolation
    return clamp(3.5 * (factor - 0.6), 0.0, 1.0);
}
