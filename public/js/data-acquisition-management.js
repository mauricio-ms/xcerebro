const EventDirectionEnum = {
    1: "LEFT",
    2: "RIGHT"
};

const EventElementsEnum = {
    "LEFT": {
        "arrow": document.getElementById("left-arrow"),
        "timer": document.getElementById("left-timer")
    },
    "RIGHT": {
        "arrow": document.getElementById("right-arrow"),
        "timer": document.getElementById("right-timer")
    }
};

// TODO - View stopSignal uses
let stopSignal = false;
socket.on("OPEN_DATA_ACQUISITION_MODAL", () => openModal("data-acquisition-modal"));
socket.on("DATA_ACQUISITION_ENDED", () => dataAcquisitionEnded());
socket.on("SET_CURRENT_EVENT", event => {
    if (event.direction === "REST") {
        return;
    }

    const direction = obtainCurrentEventDirection(event.direction);
    const eventElements = EventElementsEnum[direction];
    const arrow = eventElements["arrow"];
    arrow.className = "arrow-on";
    const timer = eventElements["timer"];
    timer.textContent = `${event.duration} s`;
});
socket.on("UPDATE_EVENT_TIMER", event => {
    // TODO - Ver para tratar o LEFT_OR_RIGHT aqui
    const eventElements = EventElementsEnum[event.direction];
    const timer = eventElements["timer"];
    const remainingTime = event.duration - event.elapsedTime;
    if (remainingTime === 0) {
        timer.textContent = "";
        eventElements["arrow"].className = "arrow-off";
    } else {
        timer.textContent = `${remainingTime} s`;
    }
});

function sendStartDataAcquisitionMessage() {
    switchStopDataAcquisitionButton(true);
    socket.emit("START_DATA_ACQUISITION");
}

function switchStopDataAcquisitionButton(enabled) {
    switchElement("stop-data-acquisition-button", enabled);
}

function switchElement(idElement, enabled) {
    const element = document.getElementById(idElement);
    element.disabled = !enabled;
}

function obtainCurrentEventDirection(direction) {
    if (direction === "LEFT_OR_RIGHT") {
        return EventDirectionEnum[randomInt(1, 2)];
    }
    return direction;
}

function dataAcquisitionEnded() {
    stopSignal = false;
    switchStopDataAcquisitionButton(false);
    closeModal("data-acquisition-modal");
}

function stopDataAcquisition() {
    stopSignal = true;
    socket.emit("END_DATA_ACQUISITION");
    switchStopDataAcquisitionButton(false);
}