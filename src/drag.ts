import { Pane } from "Tweakpane"

// it's initialized at the beginning of the app
// it uses dragData locally to this file

const dragData = {
    dragItem: null,
    initialY: 0,
    initialX: 0,
    currentX: 0,
    currentY: 0,
    xOffset: 0,
    yOffset: 0,
};



function setTranslate(x: number, y: number) {
    dragData.dragItem.style.transform = "translate3d(" + x + "px, " + y + "px, 0)";
}

function translateUI(x: number, y: number) {
    const y2 = y - window.innerHeight;

    dragData.initialX = dragData.xOffset = dragData.currentX = x;
    dragData.initialY = dragData.yOffset = dragData.currentY = y2;

    setTranslate(x, y2);
}

function setupDragUI(pane: Pane) {

    dragData.dragItem = document.getElementById("ui");

    //    #ui > div.tp-rotv.tp-cntv.tp-rotv-expanded.tp-rotv-cpl > button
    //    const selector = "#ui > div > button";
    const selector = "#ui > div > button > div.tp-rotv_t";
    let targetDragItem = document.querySelector(selector);
    const targetEvent = targetDragItem;
    document.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);

    let active = false;
    let isDragging = false;

    function fakeClick(e) {
        if (isDragging) {
            e.stopPropagation();
            isDragging = false;
        }
    };

    // overwrite the click event
    pane.controller_.view.buttonElement.addEventListener("click", fakeClick, true);

    function dragStart(e) {
        if (e.type === "touchstart") {
            dragData.initialX = e.touches[0].clientX - dragData.xOffset;
            dragData.initialY = e.touches[0].clientY - dragData.yOffset;
        } else {
            dragData.initialX = e.clientX - dragData.xOffset;
            dragData.initialY = e.clientY - dragData.yOffset;
        }

        if (e.target === targetDragItem) {
            active = true;
        }
    }

    function dragEnd(e) {
        dragData.initialX = dragData.currentX;
        dragData.initialY = dragData.currentY;
        active = false;
    }

    function drag(e) {
        if (active) {
            e.preventDefault();
            isDragging = true;

            if (e.type === "touchmove") {
                dragData.currentX = e.touches[0].clientX - dragData.initialX;
                dragData.currentY = e.touches[0].clientY - dragData.initialY;
            } else {
                dragData.currentX = e.clientX - dragData.initialX;
                dragData.currentY = e.clientY - dragData.initialY;
            }

            dragData.xOffset = dragData.currentX;
            dragData.yOffset = dragData.currentY;

            setTranslate(dragData.currentX, dragData.currentY);
        }
    }
}


export { setupDragUI, translateUI };
