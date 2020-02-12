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
socket.on("DATA_ACQUISITION_STARTED", events => startDataAcquisition(events));
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
    openModal("data-acquisition-modal");
    socket.emit("START_DATA_ACQUISITION");
}

async function startDataAcquisition(events) {
    openModal("data-acquisition-modal");
    const loop = document.getElementById("loop-cb").checked;
    if (loop) {
        await executeEventsInfinitely(events);
    } else {
        const loopTimes = document.getElementById("loop-times-input").valueAsNumber;
        for (let i = 0; i < loopTimes && !stopSignal; i++) {
            await executeEvents(events);
        }
    }

    closeModal("data-acquisition-modal");
    socket.emit("END_DATA_ACQUISITION");
}

async function executeEventsInfinitely(events) {
    while (!stopSignal) {
        await executeEvents(events);
    }
}

async function executeEvents(events) {
    for (const event of events) {
        await executeEvent(event);
    }
}

function switchStopDataAcquisitionButton(enabled) {
    switchElement("stop-data-acquisition-button", enabled);
}

function switchElement(idElement, enabled) {
    const element = document.getElementById(idElement);
    element.disabled = !enabled;
}

function executeEvent(event) {
    if (event.direction === "REST") {
        return executeRestEvent(event);
    }

    return executeLeftOrRightEvent(event);
}

function executeRestEvent(event) {
    return new Promise(resolve => {
        if (stopSignal) {
            resolve();
            return;
        }

        socket.emit("SET_CURRENT_EVENT", event.direction);

        let seconds = event.duration;
        const intervalId = setInterval(() => {
            seconds -= 1;

            if (seconds === 0 || stopSignal) {
                clearInterval(intervalId);
                resolve();
            }
        }, 1000);
    });
}

function executeLeftOrRightEvent(event) {
    return new Promise(resolve => {
        if (stopSignal) {
            resolve();
            return;
        }

        const direction = obtainCurrentEventDirection(event.direction);
        socket.emit("SET_CURRENT_EVENT", direction);

        const directionLowerCase = direction.toLowerCase();
        let seconds = event.duration;
        const arrow = document.getElementById(`${directionLowerCase}-arrow`);
        arrow.className = "arrow-on";
        const timer = document.getElementById(`${directionLowerCase}-timer`);
        timer.textContent = `${seconds} s`;

        const intervalId = setInterval(() => {
            seconds -= 1;

            if (seconds === 0 || stopSignal) {
                timer.textContent = "";
                arrow.className = "arrow-off";
                clearInterval(intervalId);
                resolve();
            } else {
                timer.textContent = `${seconds} s`;
            }
        }, 1000);
    });
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
    switchStopDataAcquisitionButton(false);
}