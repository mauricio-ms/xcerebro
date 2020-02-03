let stopSignal = false;
socket.on("EXECUTE_DATA_ACQUISITION", events => executeDataAcquisition(events));

function sendStartDataAcquisitionMessage() {
    switchStartDataAcquisitionButton(false);
    switchStopDataAcquisitionButton(true);
    socket.emit("START_DATA_ACQUISITION");
}

async function executeDataAcquisition(events) {
    const loopTimes = document.getElementById("loop-times").valueAsNumber || 1;
    for (let i = 0; i < loopTimes; i++) {
        await executeEvents(events);
    }

    stopSignal = false;
    switchStopDataAcquisitionButton(false);
    switchStartDataAcquisitionButton(true);
}

async function executeEvents(events) {
    for (const event of events) {
        await executeEvent(event);
    }
}

function switchStartDataAcquisitionButton(enabled) {
    switchElement("start-data-acquisition-button", enabled);
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

function stopDataAcquisition() {
    stopSignal = true;
    switchStopDataAcquisitionButton(false);
}