import { mat4, vec3, vec4 } from 'gl-matrix';
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

    // it's the orientation of the up vector
    upOrientation: vec4,
}



function updateManipulator(manipulator: Manipulator, dt: number)
{
    const rightDir = vec3.fromValues(1.0, 0.0, 0.0);
    const upz = vec3.fromValues(0.0, 0.0, 1.0);

    const getPitch = function(matrix: mat4) {
        let pitch = Math.atan(-matrix[6] / matrix[5]);
        if (Number.isNaN(pitch)) {
            return 0;
        }
        return pitch;
    }

    const getYaw = function(matrix: mat4) {
        return Math.atan2(matrix[4], matrix[0]);
    }

    const computeRotation = function(out: mat4, prevMatrix: mat4, dx: number, dy: number) {
        const prevPitch = getPitch(prevMatrix);
        const deltaPitch = dy / 10.0;
        let pitch = prevPitch + deltaPitch;

        const prevYaw = getYaw(prevMatrix);
        const deltaYaw = dx / 10.0;
        let yaw = prevYaw + deltaYaw;
        mat4.fromRotation(out, -pitch, rightDir);
        mat4.rotate(out, out, -yaw, upz);
    };

    let deltaX = manipulator.x.delta;
    let deltaY = manipulator.y.delta;
    const mouseFactor = 0.1;
    const scaleMouseMotion = 0.1;

    let prevMatrix = manipulator.matrix;
    let newMatrix = mat4.create();

    computeRotation(newMatrix, prevMatrix,
        -deltaX * mouseFactor * scaleMouseMotion,
        -deltaY * mouseFactor * scaleMouseMotion
    );

}
