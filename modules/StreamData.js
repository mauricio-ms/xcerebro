const lang = require("lodash/lang");
const cyton = require("openbci").Cyton;

const EventType = require("./EventType");
const Random = require("./Random");

const BOARD_PORT_NAME = "/dev/ttyUSB0";
const SIMULATOR_PORT_NAME = "OpenBCISimulator";

class StreamData {
    /**
     * @param events {array} Events to stream, where each event has a direction and a duration
     * @param loop {boolean} Boolean to define if stream infinitely
     * @param loopTimes {int} Quantity to repeat the events before end stream, only used when loop=false
     * @param executionTime {int} Time to stream data in seconds
     * @param frequency {int} The frequency to stream data
     * @param writer {object} Writer implementation to write the data streamed
     */
    constructor(events, loop, loopTimes, executionTime, frequency, writer) {
        this._board = new cyton({
            debug: false,
            verbose: false
        });
        this._socket = require("./Socket").getConnection();
        this._writer = writer;
        this._originalEvents = events;
        this._events = lang.cloneDeep(events);
        this._currentEvent = null;
        this._currentLabel = null;
        this._loop = loop;
        this._loopTimes = loopTimes;
        this._executionTime = executionTime;
        this._started = false;
        this._simulationEnabled = false;
        this._frequency = frequency;
        this._samplesCount = 0;
        this._maxSamplesCount = !loop ? executionTime * frequency * loopTimes : 0;
    }

    async start() {
        console.log(`Starting to stream by ${this._executionTime} seconds.`);
        await this.cleanUp();
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

        this._socket.emit("IS_READY_TO_START_DATA_ACQUISITION", "Are you ready?", this._startDataAcquisition.bind(this))
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

    _startDataAcquisition(permitted) {
        if (!permitted) {
            this.stop();
            return;
        }
        this._board.on("sample", sample => {
            if (!this._started) {
                this._started = true;
                this._startNextEvent();
            }

            this._samplesCount++;
            this._writer.appendSample(sample, this._currentLabel);

            if (this._samplesCount % this._frequency === 0) {
                this._currentEvent.elapsedTime++;
                const remainingTime = this._currentEvent.duration - this._currentEvent.elapsedTime;
                if (remainingTime === 0) {
                    this._socket.emit("END_EVENT", this._currentEvent);
                    if (this._events.length === 0) {
                        if (this._loop || --this._loopTimes > 0) {
                            this._events = lang.cloneDeep(this._originalEvents);
                            this._startNextEvent();
                        } else {
                            this.stop();
                        }
                    } else {
                        this._startNextEvent();
                    }
                }
            }
        });
    }

    _startNextEvent() {
        this._currentEvent = this._events.shift();
        this._currentEvent.direction = this._obtainEventDirection(this._currentEvent);
        this._currentLabel = EventType.getId(this._currentEvent.direction);
        this._socket.emit("SET_CURRENT_EVENT", this._currentEvent);
    }

    _obtainEventDirection(event) {
        if (event.direction === "LEFT_OR_RIGHT") {
            return EventType.getDescription(Random.randomInt(1, 2));
        }
        return event.direction;
    }

    async stop() {
        if (!this._started) {
            return;
        }
        this._started = false;
        await this.cleanUp();
        this._socket.emit("DATA_ACQUISITION_ENDED");
        await this._writer.write(this._maxSamplesCount);
        this._socket.emit("ON_MESSAGE", "The CSV file was successfully saved.");
    }

    async cleanUp() {
        console.log("Cleaning the stream resources")
        this._board.removeAllListeners();
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