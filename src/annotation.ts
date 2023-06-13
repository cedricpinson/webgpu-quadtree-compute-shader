import { RenderGeometry } from "./quadtree-types";
import { app } from "./app";

const data = [
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "African wild dog", "Image": "", "Family": "Canidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Hippopotamus ", "Image": "", "Family": "Hippopotamidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 15.87, "Longitude": 100.9925, "Country": "Taïland", "Animal": "dhole", "Image": "", "Family": "Canidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Black Backed jackal", "Image": "", "Family": "Canidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 35.8617, "Longitude": 104.1954, "Country": "China", "Animal": "Snow leopard", "Image": "", "Family": "Felidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 43.341, "Longitude": -80.18, "Country": "south africa", "Animal": "Lion", "Image": "", "Family": "Félidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Spotted hyaena ", "Image": "", "Family": "Hyaenidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 15.87, "Longitude": 100.9925, "Country": "Taïland", "Animal": "Binturong", "Image": "", "Family": "Viverridae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 14.235, "Longitude": 51.9253, "Country": "Brésil ", "Animal": "Maned wolf ", "Image": "", "Family": "Canidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 64.2008, "Longitude": 149.4937, "Country": "Alaska", "Animal": "Wolf ", "Image": "", "Family": "Canidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 0.0236, "Longitude": 37.9062, "Country": "Kenya", "Animal": "Bat eard fox", "Image": "", "Family": "Canidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 15.87, "Longitude": 100.9925, "Country": "Taïland ", "Animal": "Gibbon", "Image": "", "Family": "Hylobatidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger National park", "Animal": "Rhinoceros ", "Image": "", "Family": "Rhinocerotidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 1.9403, "Longitude": 29.8739, "Country": "Rwanda", "Animal": "Gorilla ", "Image": "", "Family": "Hominidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 4.2105, "Longitude": 101.9758, "Country": "Malaysia ", "Animal": "Sun bear", "Image": "", "Family": "Ursidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 14.235, "Longitude": 51.9253, "Country": "Brésil ", "Animal": "Jaguar ", "Image": "", "Family": "Felidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Aardvark ", "Image": "", "Family": "Orycterpodidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 38.4161, "Longitude": 63.6167, "Country": "Argentina ", "Animal": "Howler monkey ", "Image": "", "Family": "Atelidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 12.8797, "Longitude": 121.774, "Country": "Philippines", "Animal": "Colugo", "Image": "", "Family": " Cynocephaldae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 18.7669, "Longitude": 46.8691, "Country": "Madagascar ", "Animal": "Aye-aye", "Image": "", "Family": "Daubentoniidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 0.5897, "Longitude": 101.3431, "Country": "Sumatra", "Animal": "Tiger", "Image": "", "Family": "Felidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 76.250578, "Longitude": -100.223952, "Country": "Artic", "Animal": "Polar bear ", "Image": "", "Family": "Ursidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 7.8731, "Longitude": 80.7718, "Country": "Sri lanka", "Animal": "Macaque", "Image": "", "Family": "Cercopithecidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.4162, "Longitude": 25.6628, "Country": "Sahara", "Animal": "Fennec fox", "Image": "", "Family": "Canidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 56.1304, "Longitude": 106.3468, "Country": "Canada", "Animal": "Wolverine", "Image": "", "Family": "Mustelidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national Park", "Animal": "buffalo", "Image": "", "Family": "bovidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Band mangoose", "Image": "", "Family": "Herpestidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national Park", "Animal": "Zebra", "Image": "", "Family": "Equidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 22.3285, "Longitude": 24.6849, "Country": "Botswana ", "Animal": "Pangolin ", "Image": "", "Family": "Manidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 22.3285, "Longitude": 24.6849, "Country": "Botswana ", "Animal": "Honey badger ", "Image": "", "Family": "Mustelidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.8994, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Blue wildebeest ", "Image": "", "Family": "Bovidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 23.9884, "Longitude": 31.5547, "Country": "Kruger national park ", "Animal": "Warthog", "Image": "", "Family": "Suidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 22.3285, "Longitude": 24.6849, "Country": "Botswana ", "Animal": "Eland", "Image": "", "Family": "Bovidae ", "Type (land/sea)\r": "land\r" },
    { "Latitude": 22.3285, "Longitude": 24.6849, "Country": "Botswana ", "Animal": "Cheetah ", "Image": "", "Family": "Felidae", "Type (land/sea)\r": "land\r" },
    { "Latitude": 22.3285, "Longitude": 24.6849, "Country": "Botswana", "Animal": "Sable antelope", "Image": "", "Family": "Bovidae ", "Type (land/sea)\r": "land" }
];

function generateAnnotation(data : any) {

    const annotationBuffer = app.wgpu.device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * 2 * data.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    let tmpArray = new Float32Array(annotationBuffer.getMappedRange());

    // fill a buffer with Lat/Long/
    const degToRad = Math.PI / 180.0;
    for (let i = 0; i < data.length; i++) {
        const line = data[i];
        const lat = line.Latitude * degToRad;
        const long = line.Longitude * degToRad;
        tmpArray[i*2 + 0] = lat;
        tmpArray[i*2 + 1] = long;
    }

    annotationBuffer.unmap();
    return annotationBuffer;
}

// @ts-ignore
import NodeFunctions from "bundle-text:./node-functions.wgsl"

// @ts-ignore
import DrawShader from "bundle-text:./draw-annotation.wgsl"

function createAnnotations(quadTreeConfig: GPUBuffer, annotationTexture: GPUTexture) {

    const device = app.wgpu.device;

    // sampler for
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });

    const annotationBuffer = generateAnnotation(data);

    const createRenderGeometry = function (primitive: GPUPrimitiveTopology, shaderModule: GPUShaderModule, instanceBuffer: GPUBuffer, quadTreeConfigBuffer: GPUBuffer, annotationTexture: GPUTexture) : RenderGeometry {
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
                resource: annotationTexture.createView()
            },
            ]
        });

        return {
            pipeline: pipeline,
            bindGroup: bindGroup
        };
    };

    // create one pipeline for solid and wireframe
    const renderAnnotation = createRenderGeometry(
        "triangle-list",
        app.wgpu.device.createShaderModule({ code: NodeFunctions + DrawShader }),
        annotationBuffer,
        quadTreeConfig,
        annotationTexture
    );

    return {
        annotationBuffer: annotationBuffer,
        annotationTexture: annotationTexture,
        renderAnnotation: renderAnnotation,
        annotation: data,
        numAnnotation: data.length
    }
}

export { createAnnotations }