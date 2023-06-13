import { app } from "./app"

const AxisGeometry = {
    vertices: [
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    ]
};

function createGeometry(quadTreeConfigBuffer): any {

    const axisGeometry = AxisGeometry;

    const positionBuffer = app.wgpu.device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * axisGeometry.vertices.length,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(positionBuffer.getMappedRange()).set(axisGeometry.vertices);
    positionBuffer.unmap();


    const createRenderGeometry = function (vertexBuffer, quadTreeConfigBuffer) {

        const shader = `
        struct VertexOut {
            @builtin(position) position : vec4<f32>,
            @location(0) color          : vec3<f32>,
        };

        @group(0) @binding(0) var<uniform> config: Config;

        @vertex
        fn vertex_main( @location(0) vertex: vec3<f32>,
                        @location(1) color:  vec3<f32>
                       ) -> VertexOut
        {
            output.position = config.projectionMatrix * (config.modelMatrix * vec4<f32>(vertex,1.0));
            output.color = color;
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
        {
            return vec4<f32>(fragData.color,1.0);
        }
        `;
        const shaderModule = app.wgpu.device.createShaderModule({ code: shader });

        const pipeline = app.wgpu.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [{
                    arrayStride: 6*4,
                    attributes: [{
                        shaderLocation: 0,
                        format: "float32x3",
                        offset: 0
                    } as GPUVertexAttribute,
                    {
                        shaderLocation: 1,
                        format: "float32x3",
                        offset: 3*4
                    } as GPUVertexAttribute,
                    ]
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
                topology: 'line-list',
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: 'always',
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
                    buffer: quadTreeConfigBuffer,
                },
            }
            ]
        });

        return {
            pipeline: pipeline,
            bindGroup: bindGroup
        };
    };

    const renderGeometry = createRenderGeometry(positionBuffer, quadTreeConfigBuffer);

}
