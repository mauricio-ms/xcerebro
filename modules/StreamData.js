const cyton = require("openbci").Cyton;

const EegCsvWriter = require("./EegCsvWriter");

const board = new cyton({
    debug: false,
    verbose: false
});

class StreamData {
    /**
     * @param events {array} Preconfigured events
     * @param timeExecution {int} Time to stream data in seconds
     * @frequency frequency {int} The frequency to stream the data
     */
    constructor(events, timeExecution, frequency = 250) {
        this._events = events;
        this.timeExecution = timeExecution;
        this._timeExecutionMillis = timeExecution * 1000 - 1;
        this._startTime = null;
        this.frequency = frequency;
        this._samplesCount = timeExecution * frequency;
        this._started = false;
        this._eegCsvWriter = null;
        this._socket = null;
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
            const portName = "OpenBCISimulator";
            await board.connect(portName);
        }
    }

    setCurrentEvent(event) {
        this._event = event;
    }

    async _onReady() {
        console.log("Open BCI board ready to stream data.");
        await this._startStream();
        board.on("sample", sample => {
            if (!this._started) {
                console.log("PASSOU"); // todo fazer front ignorar se já tiver iniciado
                this._started = true;
                this._startTime = sample.boardTime;
                this._socket.emit("DATA_ACQUISITION_STARTED", this._events);
            }

            this._eegCsvWriter.appendSample(sample, this._event);
            if (this._isTimeExecutionRunOut(sample.boardTime)) {
                this.stop();
            }
        });
    }

    _isTimeExecutionRunOut(lastTimestamp) {
        const elapsedTime = lastTimestamp-this._startTime;
        return elapsedTime >= this._timeExecutionMillis;
    }

    async _startStream() {
        try {
            await board.syncRegisterSettings();
            await board.streamStart();
            // TODO - Testar com simulação, provavelmente não executar quando simulação
            const sync = await board.syncClocksFull();
            if (!sync.valid) {
                await board.syncClocksFull();
            }
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

    async stop() {
        if (!this._started) {
            return;
        }
        this._started = false;
        await this._cleanUp();
        this._socket.emit("DATA_ACQUISITION_ENDED");
        await this._eegCsvWriter.write(this._samplesCount);
        this._socket.emit("ON_MESSAGE", "The CSV file was successfully saved.");
    }

    async _cleanUp() {
        await cleanUp();

        this._startTime = null;
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