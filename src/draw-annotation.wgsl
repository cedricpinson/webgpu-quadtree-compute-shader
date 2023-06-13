
struct Annotation {
    latLong: vec2<f32>
}

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(1) uv             : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> instances: array<Annotation>;
@group(0) @binding(1) var<uniform> config: Config;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var annotationTexture: texture_2d<f32>;


// align annotation on earth lat/long
fn computeOrientationFromLatLong(latLong: vec2<f32>, z: vec3<f32> ) -> mat3x3<f32> {
  let lon = latLong.y;
  let right = vec3<f32>(-sin(lon), cos(lon), 0);
  return mat3x3<f32>(right, cross(z,right), z);
}

@vertex
fn vertex_main(@location(0) vertex: vec4<f32>,
               @builtin(instance_index) instanceIndex: u32 ) -> VertexOut
{
    var output : VertexOut;

    let latLong = instances[instanceIndex].latLong;

    let orientation = computeOrientationFromLatLong(latLong, normalize(convertLatLongTo3D(vec3<f32>(latLong,0.0))));
    // center the quad to -0.5 / 0.5
    let pos = vec2<f32>(vertex.xy - vec2<f32>(0.5));

    if (config.projectToEarth == 1) {
        // let position3d = convertLatLongTo3D(vec3<f32>(toLatLongAlt(vec2<f32>(0.0),0.0))) + (vec3<f32>(pos,0.0));
        let positionOnGlobe = convertLatLongTo3D(vec3<f32>(latLong,0.0));

        // the size from the camera is shitty
        let dist = distance(config.cameraPosition.xyz, positionOnGlobe);
        const baseSize = 100000.0;
        let factor = dist/(2.5*EarthRadius);
        let size = baseSize + (baseSize * (factor * factor * factor * factor));

        let position3d =  positionOnGlobe + orientation * (vec3<f32>(pos * size,0.0));
        output.position =  config.projectionMatrix * (config.modelMatrix * vec4<f32>(position3d, 1.0));
    } else {
        let rectCoords = toRect(latLong);
        output.position = config.projectionMatrix * (config.modelMatrix * vec4<f32>(pos * 0.1 + rectCoords, 0.02, 1.0));
    }

    output.uv = vec2<f32>(vertex.x, 1.0  - vertex.y);
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    var data : vec4<f32>;
    if (config.displayTexture == 0 || config.displayTexture == 1) {
        return textureSample(annotationTexture, textureSampler, fragData.uv);
    }

    return vec4<f32>(1.0,0.0,1.0,1.0);
}
