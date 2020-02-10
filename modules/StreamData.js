const cyton = require("openbci").Cyton;

const EegCsvWriter = require("./EegCsvWriter");

const board = new cyton({
    debug: false,
    verbose: false
});

class StreamData {
    constructor(events) {
        this._events = events;
        this._eegCsvWriter = null;
        this._socket = null;
        this._event = null;
    }

    async start(subject) {
        this._socket = require("./Socket").getConnection();
        this._eegCsvWriter = new EegCsvWriter(subject);
        await cleanUp();
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
        this._socket.emit("DATA_ACQUISITION_STARTED", this._events);
        board.on("sample", sample => this._eegCsvWriter.appendSample(sample, this._event));
    }

    async _startStream() {
        try {
            await board.syncRegisterSettings();
            await board.streamStart();
        } catch(err) {
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
        await board.streamStop();
        await this._eegCsvWriter.write();
    }
}

async function cleanUp() {
    board.removeAllListeners();

    if (board.isStreaming()) {
        console.log("Stop streaming.");
        await board.streamStop();
    }

    if (board.isConnected()) {
        console.log("Disconnect the Open BCI board.");
        board.disconnect();
    }
}

// Do something when app is closing
process.on("exit", cleanUp);

// Catches ctrl+c event
process.on("SIGINT", cleanUp);

// Catches uncaught exceptions
process.on("uncaughtException", cleanUp);

module.exports = StreamData;