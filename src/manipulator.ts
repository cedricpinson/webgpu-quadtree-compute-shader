import { ManualTicker, numberFromUnknown } from '@tweakpane/core';
import { vec3 } from 'gl-matrix';
import { setInputs, setInputTargets, SmoothInput, updateInputs } from './smooth-inputs'

interface Manipulator {
    x: SmoothInput,
    y: SmoothInput,
    zoom: SmoothInput,
    sceneRadius: number,
    sceneCenter: number,

    target: vec3,
    eye: vec3,
    tilt: number,
}



function updateManipulator(manipulator: Manipulator, dt: number) {
    updateInputs([manipulator.x, manipulator.y, manipulator.zoom], dt, 1.0 / 10.0);
    // console.log("distance ", manipulator.zoom.current);
}

function resetManipulator(manipulator: Manipulator) {
    setInputs([manipulator.x, manipulator.y], [0, 0]);
}

let wheel: number = 0;
function resetZoom(manipulator: Manipulator, zoomValue: number, sceneRadius: number, sceneCenter: number) {
    setInputs([manipulator.zoom], [zoomValue]);
    manipulator.sceneRadius = sceneRadius;
    manipulator.sceneCenter = sceneCenter;
    wheel = zoomValue;
}

function smoothStep(x: number) {
    if (x < 0) {
        x = 0;
    }

    if (x > 1.0) {
        x = 1.0;
    }

    return x * x * (3 - 2 * x);
}

function setupManipulator(element: HTMLCanvasElement, manipulator: Manipulator, sceneRadius: number, sceneCenter: number) {

    manipulator.x = { current: 0, delta: 0, target: 0 };
    manipulator.y = { current: 0, delta: 0, target: 0 };
    manipulator.zoom = { current: 0, delta: 0, target: 0 };
    manipulator.sceneRadius = sceneRadius;
    manipulator.sceneCenter = sceneCenter;

    resetZoom(manipulator, sceneRadius * 2, sceneRadius, sceneCenter);

    const scaleFromDistance = function () {
        let distMin = manipulator.sceneCenter;
        let distMax = 2.0 * manipulator.sceneRadius;
        let range = distMax - distMin;
        let value =( manipulator.zoom.current - distMin) / range;
        let smooth = smoothStep(value);
        return Math.max(0.001, value);
    }

    // connect weel event
    const onWeelEvent = function (event: WheelEvent) {
        let scaler = 0.001 * manipulator.sceneRadius;
        const distance = scaler * scaleFromDistance();
        wheel += event.deltaY * distance;
        wheel = Math.max(wheel, manipulator.sceneCenter);
        wheel = Math.min(wheel, manipulator.sceneRadius * 3.0);
        // //Math.max(0.001, manipulator.zoom.current + (distance * event.deltaY * scale))
        // console.log(wheel, distance, event.deltaY * distance, "zoom value", manipulator.zoom.current);
        setInputTargets([manipulator.zoom], [wheel]);
        event.stopPropagation();
        event.preventDefault();
        return false;
    };

    let mouseDown = false;
    let x = 0;
    let y = 0;
    let xglobal = 0;
    let yglobal = 0;

    // connect mouse x/y
    const onMouseMoveEvent = function (event: MouseEvent) {

        if (!mouseDown) {
            return false;
        }

        const distance = scaleFromDistance() * 0.4;
        xglobal += distance * (event.offsetX - x);
        yglobal += distance * (event.offsetY - y);
        x = event.offsetX;
        y = event.offsetY;
        setInputTargets([manipulator.x, manipulator.y], [xglobal, yglobal]);
        return false;
    };

    // connect mouse x/y
    const onMouseDownEvent = function (event: MouseEvent) {
        mouseDown = true;
        x = event.offsetX;
        y = event.offsetY;
        return false;
    };

    // connect mouse x/y
    const onMouseUpEvent = function (event: WheelEvent) {
        mouseDown = false;
        return false;
    };

    window.addEventListener('wheel', onWeelEvent, { passive: false });
    element.addEventListener('mousemove', onMouseMoveEvent);
    element.addEventListener('mousedown', onMouseDownEvent);
    element.addEventListener('mouseup', onMouseUpEvent);

}

export { Manipulator, updateManipulator, setupManipulator, resetManipulator, resetZoom };