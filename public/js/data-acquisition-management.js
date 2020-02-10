let stopSignal = false;
socket.on("DATA_ACQUISITION_STARTED", events => startDataAcquisition(events));
socket.on("DATA_ACQUISITION_ENDED", () => dataAcquisitionEnded());

function sendStartDataAcquisitionMessage() {
    switchStopDataAcquisitionButton(true);
    socket.emit("START_DATA_ACQUISITION");
}

async function startDataAcquisition(events) {
    const loopTimes = document.getElementById("loop-times-input").valueAsNumber || 1;
    for (let i = 0; i < loopTimes; i++) {
        await executeEvents(events);
    }

    closeModal("data-acquisition-modal");
    socket.emit("END_DATA_ACQUISITION");
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

        let seconds = event.duration;
        const direction = event.direction.toLowerCase();
        const arrow = document.getElementById(`${direction}-arrow`);
        arrow.className = "arrow-on";
        const timer = document.getElementById(`${direction}-timer`);
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

function dataAcquisitionEnded() {
    stopSignal = false;
    switchStopDataAcquisitionButton(false);
}

function stopDataAcquisition() {
    stopSignal = true;
    switchStopDataAcquisitionButton(false);
}