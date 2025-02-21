import { mat4, vec4, vec3 } from "gl-matrix"
import { createTexture, initWebGPU, loadImage, saveFile, setupResize } from "./utils"
import { app, MoveCamera } from "./app"
import { initQuadTree, QuadTreeFunctions } from "./quadtree"
import { Pane } from "Tweakpane"
import { setupDragUI, translateUI } from "./drag"
import { resetZoom, setupManipulator, updateManipulator, resetManipulator } from "./manipulator"
// import { TabItemController } from "@tweakpane/core/dist/cjs/blade/tab/controller/tab-item"

export { };

const EarthRadius = 6378137.0 + 9000 * 2;
const ModelConfig = {
    plane: {
        name: 'plane',
        radius: 2.0,
        center: 0.0,
        lodScaleFactor: {
            min: 0.5,
            max: 2,
            format: (v: number) => v.toFixed(5),
            lodScaleFactor: 1,
        }
    },
    earth: {
        name: 'earth',
        radius: EarthRadius,
        center: EarthRadius,
        lodScaleFactor: {
            min: 0.00000002,
            // min: 0.00000005
            max: 0.0000005,
            lodScaleFactor: 0.00000025,
            format: (v: number) => v.toFixed(10),
        },
        evaluateRealCamera: false,
        k: 16
    }
};

function getModelConfig() {
    if (app.config.projectToEarth) {
        return ModelConfig.earth;
    }
    return ModelConfig.plane
}

function setupUI() {

    const precision5 = {
        format: (v: number) => v.toFixed(5),
    };

    const pane = new Pane({
        title: 'Parameters',
        expanded: true,
        container: document.getElementById('ui')
    });
    setupDragUI(pane);

    pane.addMonitor(app.config, 'frameNumber', {
        format: (v: number) => v.toFixed(0),
    });

    pane.addButton({
        title: 'debugBuffers',
    }).on('click', () => {
        app.config.debugBuffers = true;
    });

    pane.addButton({
        title: 'reset camera',
    }).on('click', () => {
        resetManipulator(app.manipulator);
    });


    const setupTabModel = function (config: any, tabIndex: number) {
        tab.pages[tabIndex].addInput(config, 'lodScaleFactor', {
            min: config.min, max: config.max,
            format: config.format,
        }).on('change', (ev) => {
            app.config.lodScaleFactor = ev.value;
        });
    };

    const tab = pane.addTab({
        pages: [
            { title: 'plane' },
            { title: 'earth' },
        ],
    }).on('select', (ev) => {
        let config = null;
        if (ev.index == 0) {
            config = ModelConfig.plane;
            app.config.projectToEarth = false;
            app.config.evaluateLodIn3D = false;
            app.config.evaluateRealCamera = false;
        } else {
            config = ModelConfig.earth;
            app.config.projectToEarth = true;
            app.config.evaluateLodIn3D = true;
            app.config.evaluateRealCamera = config.evaluateRealCamera;
        }
        app.config.lodScaleFactor = config.lodScaleFactor.lodScaleFactor;
        resetZoom(app.manipulator, config.radius * 2, config.radius, config.center);
        // pane.refresh();
        console.log(config);
        console.log(app.config);
    });

    setupTabModel(ModelConfig.plane.lodScaleFactor, 0);
    setupTabModel(ModelConfig.earth.lodScaleFactor, 1);
    tab.pages[1].addInput(ModelConfig.earth, 'evaluateRealCamera').on('change', (ev) => {
        app.config.evaluateRealCamera = ev.value;
    });

    pane.addInput(app.config, 'gridResolution', {
        options: {
            'grid-1': 0,
            'grid-4': 1,
        },
    });

    pane.addInput(app.config, 'displayTexture', {
        options: {
            'earth': 0,
            'elevation': 1,
            'none': 2,
        },
    });

    pane.addInput(app.config, 'rotate');

    pane.addButton({
        title: 'Random Animation',
    }).on('click', () => {
        app.config.camera.start = [Math.random() - 0.5, Math.random() - 0.5],
            app.config.camera.stop = [Math.random() - 0.5, Math.random() - 0.5],
            app.config.camera.t = 0.0;
    });

    pane.addInput(app.config, 'elevationScale', {
        min: 0.5, max: 2.0
    }
    );

    pane.addInput(app.config, 'position', {
        x: { min: -1.0, max: 1.0 },
        y: { inverted: true, min: -0.5, max: 0.5 },
    }).on('change', (ev) => {
        app.config.position['x'] = ev.value['x'];
        app.config.position['y'] = ev.value['y'];
        app.config.pause = true;
        pane.refresh();
    });

    pane.addInput(app.config, 'pause');
    pane.addInput(app.config, 'wireframe');
    pane.addMonitor(app.config, 'frameTime');
    pane.addMonitor(app.config, 'updateQuadTree', precision5);
    pane.addMonitor(app.config, 'renderQuadTree', precision5);

    pane.addMonitor(app.manipulator.zoom, 'current');
    pane.addButton({ title: 'export Preset' }).on('click', () => {
        const preset = pane.exportPreset();
        console.log(preset);
        saveFile(preset);
    });
    translateUI(10, 10);

    tab.pages[1].selected = true;
    pane.refresh();


    app.pane = pane;
}

function updateCamera(motion: MoveCamera, t: number) {
    motion.t += t;

    const factor = Math.min(1.0, motion.t / motion.duration);
    const f = 1.0 - factor;

    // interpolate
    motion.current[0] = motion.stop[0] * factor + motion.start[0] * f;
    motion.current[1] = motion.stop[1] * factor + motion.start[1] * f;

    app.config.position['x'] = motion.current[0];
    app.config.position['y'] = motion.current[1];
}

async function initApp() {

    const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
    app.wgpu = await initWebGPU(canvas);

    setupManipulator(canvas, app.manipulator, getModelConfig().radius, getModelConfig().center);

    // init UI debug
    setupUI();

    app.modelMatrix = mat4.create();
    app.projectionMatrix = mat4.create();

    // setup resize
    const resizeCallback = function (width: number, height: number) {
        // console.log(`${width} x ${height}`);

        app.wgpu.canvas.width = width;
        app.wgpu.canvas.height = height;

        updateProjection();
    };

    setupResize(canvas, resizeCallback);
    resizeCallback(app.wgpu.canvas.width, app.wgpu.canvas.height);

    return true;
}

function updateProjection() {

    const current = app.manipulator.zoom.current;
    let radius: number = getModelConfig().radius;

    // compute almost optimium near plane
    let newNear = Math.max(0.001, (current - radius) * 0.5);
    // console.log(newNear);
    const w = app.wgpu.canvas.width;
    const h = app.wgpu.canvas.height;
    mat4.perspective(app.projectionMatrix, Math.PI / 180.0 * 60.0, w / h, newNear, null);
}

export async function main() {

    await initApp();

    const elevation = await loadImage('textures/elevation.png');
    const earth = await loadImage('textures/earth.jpg');
    // const annotation = await loadImage('textures/annotation.jpg');
    const elevationTexture = createTexture(elevation, 'r8unorm');
    const earthTexture = createTexture(earth, 'rgba8unorm');
    const annotationTexture = null;

    const quadTree = initQuadTree(elevationTexture, earthTexture, annotationTexture);

    let rotate = 0.0;
    let previousTime = performance.now();
    const renderLoop = async () => {
        const currentTime = performance.now();
        const delta = currentTime - previousTime;
        previousTime = currentTime;

        const dt = delta / 1000.0;
        if (app.config.pause == false) {
            updateCamera(app.config.camera, dt);

            if (app.config.rotate) {
                rotate += -dt * 0.03;
            }
        }
        updateManipulator(app.manipulator, dt);
        updateProjection();

        mat4.identity(app.modelMatrix);

        let cameraPosition: vec3;

        // quad tree works from 0-1 so we trnaslate to -1.0 : 0.5 ( because we have 2 quads to form a panorama)
        // there are 2 setup:
        // projectToEarth : project the quads to sphere ...
        // !projectToEarth: keep things plannar to debug ...
        if (!app.config.projectToEarth) {
            mat4.rotateX(app.modelMatrix, app.modelMatrix, app.manipulator.y.current * 0.01);
            mat4.rotateY(app.modelMatrix, app.modelMatrix, app.manipulator.x.current * 0.01);

            let camera = mat4.create();
            mat4.translate(app.modelMatrix, app.modelMatrix, [-1.0, -0.5, 0.0]);

            mat4.lookAt(camera, [0, 0, app.manipulator.zoom.current], [0.0, 0.0, 0], [0, 1, 0]);
            mat4.multiply(app.modelMatrix, camera, app.modelMatrix);
        } else {

            // const yValue = app.manipulator.y.current * 0.01;
            const yValue = app.manipulator.y.current * 0.01;
            const xValue = app.manipulator.x.current * 0.01;

            // #ifdef :)
            if (true) {
                // the camera always look at the center of earth (0,0,0)
                // we compute a position around earth and then use a lookat

                mat4.rotateX(app.modelMatrix, app.modelMatrix, Math.PI * 0.5);
                mat4.rotateY(app.modelMatrix, app.modelMatrix, rotate + -xValue);
                mat4.rotateX(app.modelMatrix, app.modelMatrix, -yValue);

                const initialCameraPosition = vec3.fromValues(0, 0, app.manipulator.zoom.current);

                cameraPosition = vec3.transformMat4(vec3.create(), initialCameraPosition, app.modelMatrix);
                // console.log(cameraPosition[0], cameraPosition[1],cameraPosition[2], app.manipulator.zoom.current);

                mat4.lookAt(app.modelMatrix, cameraPosition, [0, 0, 0], [0, 0, 1]);

            } else {
                mat4.rotateY(app.modelMatrix, app.modelMatrix, yValue);
                mat4.rotateZ(app.modelMatrix, app.modelMatrix, rotate + xValue);

                const initialCameraPosition = vec3.fromValues(app.manipulator.zoom.current, 0, 0);

                cameraPosition = vec3.transformMat4(vec3.create(), initialCameraPosition, mat4.invert(mat4.create(), app.modelMatrix));
                //console.log(cameraPosition[0], cameraPosition[1],cameraPosition[2]);

                let camera = mat4.create();
                mat4.lookAt(camera, initialCameraPosition, [1, 0, 0], [0, 0, 1]);
                //console.log(camera);
                mat4.multiply(app.modelMatrix, camera, app.modelMatrix);
            }
        }


        // update per frame
        quadTree.quadTreeData.config.evaluateLodIn3D = app.config.evaluateLodIn3D;
        quadTree.quadTreeData.config.evaluateRealCamera = app.config.evaluateRealCamera;
        quadTree.quadTreeData.config.projectToEarth = app.config.projectToEarth;
        quadTree.quadTreeData.config.displayTexture = app.config.displayTexture;
        quadTree.quadTreeData.config.elevationScale = app.config.elevationScale;
        quadTree.quadTreeData.config.lodScaleFactor = app.config.lodScaleFactor;

        if (app.config.evaluateRealCamera) {
            quadTree.quadTreeData.config.cameraPosition = app.config.projectToEarth ? vec4.fromValues(cameraPosition[0], cameraPosition[1], cameraPosition[2], 0) : vec4.fromValues(0, 0, app.manipulator.zoom.current, 0);
        } else {
            quadTree.quadTreeData.config.cameraPosition = vec4.fromValues(app.config.position['x'] + 1.0, app.config.position['y'] + 0.5, 0, 0);
        }

        quadTree.quadTreeData.config.projectionMatrix = app.projectionMatrix;
        quadTree.quadTreeData.config.modelMatrix = app.modelMatrix;

        quadTree.initUpdate(quadTree.quadTreeData);
        quadTree.updateQuadTree(quadTree.quadTreeData);
        quadTree.renderQuadTree(quadTree.quadTreeData);

        app.config.frameTime = delta;

        requestAnimationFrame(renderLoop);
        return true;
    };

    renderLoop();
    return true;
}

main();
