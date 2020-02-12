const lang = require("lodash/lang");
const cyton = require("openbci").Cyton;

const EegCsvWriter = require("./EegCsvWriter");

const EventEnum = {
    "REST": 0,
    "LEFT": 1,
    "RIGHT": 2
};

const board = new cyton({
    debug: false,
    verbose: false
});

class StreamData {
    /**
     * @param events {array} Events to stream, where each event has a direction and a duration
     * @param timeExecution {int} Time to stream data in seconds
     * @param frequency {int} The frequency to stream data
     */
    // TODO AJUSTAR PARA RECEBER O VALOR OU IMPORTAR A CONFIG
    constructor(events, timeExecution, frequency = 250) {
        this._events = lang.clone(events);
        this._currentEvent = null;
        // TODO MELHORAR NOME
        this._currentEventDirection = null;
        this.timeExecution = timeExecution;
        this._timeExecutionMillis = timeExecution * 1000 - 1;
        this._startTime = null;
        this._simulationEnabled = false;
        this.frequency = frequency;
        this._samplesCount = 0;
        this._maxSamplesCount = timeExecution * frequency;
        this._started = false;
        this._eegCsvWriter = null;
        this._socket = null;
        // TODO - REMOVER
        this._event = null;
    }

    async start(subject) {
        console.log(`Starting to stream by ${this.timeExecution} seconds.`);
        await this._cleanUp();
        this._socket = require("./Socket").getConnection(); // TODO testar colocar no construtor
        this._eegCsvWriter = new EegCsvWriter(subject);
        board.on("ready", this._onReady.bind(this));

        try {
            const portName = "/dev/ttyUSB0";
            await board.connect(portName);
        } catch (e) {
            console.log("Open BCI board not found. Connecting to Open BCI simulator.");
            this._simulationEnabled = true;
            const portName = "OpenBCISimulator";
            await board.connect(portName);
        }
    }

    // TODO - REMOVER
    setCurrentEvent(event) {
        this._event = event;
    }

    async _onReady() {
        console.log("Open BCI board ready to stream data.");
        await this._startStream();
        if (!this._simulationEnabled) {
            await this._syncClocksFull();
        }
        board.on("sample", sample => {
            if (!this._started) {
                console.log("PASSOU"); // todo fazer front ignorar se já tiver iniciado
                this._started = true;
                this._startTime = sample.boardTime;
                this._startNextEvent();
                // TODO - REMOVER esse evento
                //this._socket.emit("DATA_ACQUISITION_STARTED", this._events);
            }

            this._samplesCount++;
            // TODO - TESTAR CASO DE DIRECTION LEFT OR RIGHT
            this._eegCsvWriter.appendSample(sample, this._currentEventDirection);

            if (this._isTimeExecutionRunOut(sample.boardTime)) {
                this.stop();
            } else if (this._samplesCount % this.frequency === 0) {
                this._currentEvent.elapsedTime++;
                this._socket.emit("UPDATE_EVENT_TIMER", this._currentEvent);
                const remainingTime = this._currentEvent.duration - this._currentEvent.elapsedTime;
                if (remainingTime === 0) {
                    if (this._events.length === 0) {
                        this.stop();
                    } else {
                        this._startNextEvent();
                    }
                }
            }
        });
    }

    _startNextEvent() {
        this._currentEvent = this._events.shift();
        this._currentEventDirection = EventEnum[this._currentEvent.direction];
        this._socket.emit("SET_CURRENT_EVENT", this._currentEvent);
    }

    _isTimeExecutionRunOut(lastTimestamp) {
        const elapsedTime = lastTimestamp-this._startTime;
        return elapsedTime >= this._timeExecutionMillis;
    }

    async _startStream() {
        try {
            await board.syncRegisterSettings();
            await board.streamStart();
        } catch (err) {
            try {
                console.log("Error starting the stream: ", err);
                await board.streamStart();
            } catch (err) {
                console.log("Fatal error starting the stream data: ", err);
                process.exit(0);
            }
        }
    }

    async _syncClocksFull() {
        const sync = await board.syncClocksFull();
        if (!sync.valid) {
            await board.syncClocksFull();
        }
    }

    async stop() {
        if (!this._started) {
            return;
        }
        this._started = false;
        await this._cleanUp();
        this._socket.emit("DATA_ACQUISITION_ENDED");
        await this._eegCsvWriter.write(this._maxSamplesCount);
        this._socket.emit("ON_MESSAGE", "The CSV file was successfully saved.");
    }

    async _cleanUp() {
        await cleanUp();
        this._startTime = null;
        this._simulationEnabled = false;
    }
}

async function cleanUp() {
    board.removeAllListeners();

    if (board.isStreaming()) {
        console.log("Stopping streaming.");
        await board.streamStop();
    }

    if (board.isConnected()) {
        console.log("Disconnecting the Open BCI board.");
        await board.disconnect();
    }
}

// Do something when app is closing
process.on("exit", cleanUp);

// Catches ctrl+c event
process.on("SIGINT", cleanUp);

// Catches uncaught exceptions
process.on("uncaughtException", cleanUp);

module.exports = StreamData;