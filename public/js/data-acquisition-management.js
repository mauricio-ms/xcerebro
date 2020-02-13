const ElementsByEvent = {
    "LEFT": {
        "arrow": document.getElementById("left-arrow"),
        "timer": document.getElementById("left-timer")
    },
    "RIGHT": {
        "arrow": document.getElementById("right-arrow"),
        "timer": document.getElementById("right-timer")
    }
};

function startDataAcquisition() {
    socket.emit("START_DATA_ACQUISITION");
}

function stopDataAcquisition() {
    socket.emit("END_DATA_ACQUISITION");
    _switchStopDataAcquisitionButton(false);
}

socket.on("OPEN_DATA_ACQUISITION_MODAL", () => openModal("data-acquisition-modal"));

socket.on("IS_READY_TO_START_DATA_ACQUISITION", (message, onConfirmationFn) => {
    const confirmed = confirm(message);
    if (confirmed) {
        _switchStopDataAcquisitionButton(true);
    } else {
        closeModal("data-acquisition-modal");
    }
    onConfirmationFn(confirmed);
});

socket.on("DATA_ACQUISITION_ENDED", () => {
    closeModal("data-acquisition-modal");
    _switchStopDataAcquisitionButton(false);
    const leftElements = ElementsByEvent["LEFT"];
    const rightElements = ElementsByEvent["RIGHT"];
    leftElements["arrow"].className = "arrow-off";
    rightElements["arrow"].className = "arrow-off";
    leftElements["timer"].textContent = "";
    rightElements["timer"].textContent = "";
});

socket.on("SET_CURRENT_EVENT", event => {
    if (event.direction === "REST") {
        return;
    }

    const eventElements = ElementsByEvent[event.direction];
    const arrow = eventElements["arrow"];
    arrow.className = "arrow-on";
    const timer = eventElements["timer"];
    timer.textContent = `${event.duration} s`;
});

socket.on("UPDATE_EVENT_TIMER", event => {
    const eventElements = ElementsByEvent[event.direction];
    const timer = eventElements["timer"];
    const remainingTime = event.duration - event.elapsedTime;
    if (remainingTime === 0) {
        timer.textContent = "";
        eventElements["arrow"].className = "arrow-off";
    } else {
        timer.textContent = `${remainingTime} s`;
    }
});

function _switchStopDataAcquisitionButton(enabled) {
    switchElement("stop-data-acquisition-button", enabled);
}