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
        let value = (manipulator.zoom.current - distMin) / range;
        let smooth = smoothStep(value);
        return Math.max(0.001, value);
    }

    // Combined state for both mouse and touch
    let isPointerDown = false;
    let lastX = 0;
    let lastY = 0;
    let xglobal = 0;
    let yglobal = 0;
    let lastPinchDistance = 0;

    // Handle zoom from either wheel or pinch
    const handleZoom = function (delta: number) {
        let scaler = 0.001 * manipulator.sceneRadius;
        const distance = scaler * scaleFromDistance();
        wheel += delta * distance;
        wheel = Math.max(wheel, manipulator.sceneCenter);
        wheel = Math.min(wheel, manipulator.sceneRadius * 3.0);
        setInputTargets([manipulator.zoom], [wheel]);
    };

    // Handle pan from either mouse or single touch
    const handlePan = function (currentX: number, currentY: number) {
        if (!isPointerDown) return;

        const distance = scaleFromDistance() * 0.4;
        xglobal += distance * (currentX - lastX);
        yglobal += distance * (currentY - lastY);
        lastX = currentX;
        lastY = currentY;
        setInputTargets([manipulator.x, manipulator.y], [xglobal, yglobal]);
    };

    // Mouse Events
    element.addEventListener('mousedown', (event: MouseEvent) => {
        isPointerDown = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
    });

    element.addEventListener('mousemove', (event: MouseEvent) => {
        handlePan(event.offsetX, event.offsetY);
    });

    element.addEventListener('mouseup', () => {
        isPointerDown = false;
    });

    // Wheel zoom
    window.addEventListener('wheel', (event: WheelEvent) => {
        event.preventDefault();
        handleZoom(event.deltaY);
    }, { passive: false });

    // Touch Events
    element.addEventListener('touchstart', (event: TouchEvent) => {
        event.preventDefault();
        isPointerDown = true;

        if (event.touches.length === 1) {
            // Single touch for panning
            lastX = event.touches[0].clientX;
            lastY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            // Two finger touch for zooming
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            lastPinchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }, { passive: false });

    element.addEventListener('touchmove', (event: TouchEvent) => {
        event.preventDefault();

        if (event.touches.length === 1) {
            // Handle panning
            const touch = event.touches[0];
            handlePan(touch.clientX, touch.clientY);
        } else if (event.touches.length === 2) {
            // Handle pinch zooming
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            const delta = lastPinchDistance - currentDistance;
            handleZoom(delta);
            lastPinchDistance = currentDistance;
        }
    }, { passive: false });

    element.addEventListener('touchend', (event: TouchEvent) => {
        event.preventDefault();
        isPointerDown = false;
    }, { passive: false });
}

export { Manipulator, updateManipulator, setupManipulator, resetManipulator, resetZoom };