
interface SmoothInput {
    current: number,
    target: number,
    delta: number,
}

function updateInputs(list : Array<SmoothInput>, dt: number, delay: number) {
    for (let i = 0; i < list.length; i++) {
        const d = (list[i].target - list[i].current) * delay;
        list[i].delta = d;
        list[i].current += d;
    }
}

function setInputs(list : Array<SmoothInput>, values: Array<number>) {
    for (let i = 0; i < list.length; i++) {
        list[i].current = list[i].target = values[i];
        list[i].delta = 0.0;
    }
}

function setInputTargets(list : Array<SmoothInput>, values: Array<number>) {
    for (let i = 0; i < list.length; i++) {
        list[i].target = values[i];
    }
}

export { SmoothInput, updateInputs, setInputTargets, setInputs}
