const ElementsByEvent = {
    "LEFT": {
        "arrow": document.getElementById("left-arrow")
    },
    "RIGHT": {
        "arrow": document.getElementById("right-arrow")
    }
};
const connectionStatusTextElement = document.getElementById("connection-status-text");

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
    const leftElements = ElementsByEvent["LEFT"];
    const rightElements = ElementsByEvent["RIGHT"];
    leftElements["arrow"].className = "arrow-off";
    rightElements["arrow"].className = "arrow-off";
});

socket.on("SET_CURRENT_EVENT", event => {
    if (event.direction === "REST") {
        return;
    }

    const eventElements = ElementsByEvent[event.direction];
    const arrow = eventElements["arrow"];
    arrow.className = "arrow-on";
});

socket.on("END_EVENT", event => {
    if (event.direction === "REST") {
        return;
    }
    ElementsByEvent[event.direction]["arrow"].className = "arrow-off"
});

function _switchStopDataAcquisitionButton(enabled) {
    switchElement("stop-data-acquisition-button", enabled);
}