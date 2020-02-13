const lang = require("lodash/lang");
const cyton = require("openbci").Cyton;

const EventType = require("./EventType");

const BOARD_PORT_NAME = "/dev/ttyUSB0";
const SIMULATOR_PORT_NAME = "OpenBCISimulator";

class StreamData {
    /**
     * @param events {array} Events to stream, where each event has a direction and a duration
     * @param timeExecution {int} Time to stream data in seconds
     * @param frequency {int} The frequency to stream data
     * @param writer {object} Writer implementation to write the data streamed
     */
    constructor(events, timeExecution, frequency, writer) {
        this._board = new cyton({
            debug: false,
            verbose: false
        });
        this._socket = require("./Socket").getConnection();
        this._writer = writer;
        this._events = lang.cloneDeep(events);
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
        this._configureCleanUp();
    }

    // TODO - Adjust
    _configureCleanUp() {
        // Do something when app is closing
        process.on("exit", this._cleanUp);

        // Catches ctrl+c event
        process.on("SIGINT", this._cleanUp);

        // Catches uncaught exceptions
        process.on("uncaughtException", this._cleanUp);
    }

    async start() {
        console.log(`Starting to stream by ${this.timeExecution} seconds.`);
        await this._cleanUp();
        this._board.on("ready", this._onReady.bind(this));

        try {
            await this._board.connect(BOARD_PORT_NAME);
        } catch (e) {
            console.log("Open BCI board not found. Connecting to Open BCI simulator.");
            this._simulationEnabled = true;
            await this._board.connect(SIMULATOR_PORT_NAME);
        }
    }

    async _onReady() {
        console.log("Open BCI board ready to stream data.");
        await this._startStream();
        if (!this._simulationEnabled) {
            await this._syncClocksFull();
        }
        // TODO - Handle times and loop parameters
        this._board.on("sample", sample => {
            if (!this._started) {
                console.log("PASSOU"); // todo fazer front ignorar se já tiver iniciado
                this._started = true;
                this._startTime = sample.boardTime;
                this._startNextEvent();
            }

            this._samplesCount++;
            // TODO - TESTAR CASO DE DIRECTION LEFT OR RIGHT
            this._writer.appendSample(sample, this._currentEventDirection);

            // TODO - View if necessary verify time
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
        this._currentEventDirection = EventType[this._currentEvent.direction];
        this._socket.emit("SET_CURRENT_EVENT", this._currentEvent);
    }

    _isTimeExecutionRunOut(lastTimestamp) {
        const elapsedTime = lastTimestamp-this._startTime;
        return elapsedTime >= this._timeExecutionMillis;
    }

    async _startStream() {
        try {
            await this._board.syncRegisterSettings();
            await this._board.streamStart();
        } catch (err) {
            try {
                console.log("Error starting the stream: ", err);
                await this._board.streamStart();
            } catch (err) {
                console.log("Fatal error starting the stream data: ", err);
                process.exit(0);
            }
        }
    }

    async _syncClocksFull() {
        const sync = await this._board.syncClocksFull();
        if (!sync.valid) {
            await this._board.syncClocksFull();
        }
    }

    async stop() {
        if (!this._started) {
            return;
        }
        this._started = false;
        await this._cleanUp();
        this._socket.emit("DATA_ACQUISITION_ENDED");
        await this._writer.write(this._maxSamplesCount);
        this._socket.emit("ON_MESSAGE", "The CSV file was successfully saved.");
    }

    // TODO - Clean writer
    async _cleanUp() {
        this._board.removeAllListeners();
        this._startTime = null;
        this._simulationEnabled = false;

        if (this._board.isStreaming()) {
            console.log("Stopping streaming.");
            await this._board.streamStop();
        }

        if (this._board.isConnected()) {
            console.log("Disconnecting the Open BCI board.");
            await this._board.disconnect();
        }
    }
}

module.exports = StreamData;