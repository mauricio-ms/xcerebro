const connectionStatusTextElement = document.getElementById("connection-status-text");

const canvas = document.getElementById("fixation-cross-canvas");
const context = canvas.getContext("2d");
context.font="80px FontAwesome";

setTimeout(() => {
    loadFonts();
    drawFixationCross();
}, 1000);

function loadFonts() {
    showLeftArrow();
    showRightArrow();
}

function drawFixationCross() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();

    context.moveTo(200, 100);
    context.lineTo(400, 100 );

    context.moveTo(300, 0);
    context.lineTo(300, 200);

    context.stroke();
}

function showLeftArrow() {
    drawFixationCross();
    context.fillStyle="#ff0000";
    context.fillText("\uf30a", 230, 130);
}

function showRightArrow() {
    drawFixationCross();
    context.fillStyle="#ff0000";
    context.fillText("\uf30b", 300, 130);
}

function startDataAcquisition() {
    socket.emit("START_DATA_ACQUISITION");
}

function stopDataAcquisition() {
    socket.emit("END_DATA_ACQUISITION");
    _switchStopDataAcquisitionButton(false);
}

socket.on("OPEN_DATA_ACQUISITION_MODAL", () => openModal("data-acquisition-modal"));

socket.on("IS_READY_TO_START_DATA_ACQUISITION", (connectionStatusText, onConfirmationFn) => {
    connectionStatusTextElement.textContent = connectionStatusText;
    setTimeout(() => {
        const confirmed = confirm("Are you ready?");
        if (confirmed) {
            _switchStopDataAcquisitionButton(true);
        } else {
            socket.emit("CLEAN_UP_DATA_ACQUISITION_RESOURCES");
            _switchStopDataAcquisitionButton(false);
        }
        onConfirmationFn(confirmed);
    }, 20);
});

socket.on("DATA_ACQUISITION_ENDED", () => {
    connectionStatusTextElement.textContent = "";
    closeModal("data-acquisition-modal");
    _switchStopDataAcquisitionButton(false);
});

socket.on("SET_CURRENT_EVENT", event => {
    if (event.direction === "REST") {
        drawFixationCross();
    } else if (event.direction === "LEFT") {
        showLeftArrow();
    } else if (event.direction === "RIGHT") {
        showRightArrow();
    }
});

function _switchStopDataAcquisitionButton(enabled) {
    switchElement("stop-data-acquisition-button", enabled);
}