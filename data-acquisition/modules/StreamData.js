const lang = require("lodash/lang");
const collection = require("lodash/collection");
const math = require("lodash/math");
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
     * @param frequency {int} The frequency to stream data
     * @param writer {object} Writer implementation to write the data streamed
     */
    constructor(events, loop, loopTimes, frequency, writer) {
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
        this._randomDirections = this._generateRandomDirections();
        this._executionTimes = this._generateExecutionTimes();
        this._executionTime = math.sum(this._executionTimes);
        this._started = false;
        this._simulationEnabled = false;
        this._frequency = frequency;
        this._samplesCount = 0;
        this._remainingSamples = 0;
        this._maxSamplesCount = !this._loop ?
            Math.round(this._executionTime * this._frequency)
            : 0;
    }

    _generateRandomDirections() {
        const randomEventsLength = this._loopTimes * this._originalEvents
            .filter(event => event.direction === "LEFT_OR_RIGHT")
            .length;

        const singleEventsLength = Math.floor(randomEventsLength / 2);
        const eventsLength = {
            "LEFT": singleEventsLength,
            "RIGHT": singleEventsLength
        };
        // If the events is odd, increment randomly to one of the two classes
        if (randomEventsLength % 2 !== 0) {
            eventsLength[EventType.getDescription(Random.randomInt(1, 2))]++;
        }

        const leftEvents = new Array(eventsLength["LEFT"])
            .fill(EventType.getId("LEFT"));
        const rightEvents = new Array(eventsLength["RIGHT"])
            .fill(EventType.getId("RIGHT"));
        return collection.shuffle(leftEvents.concat(rightEvents));
    }

    _generateExecutionTimes() {
        let executionsTime = [];
        for (let i=0; i<this._loopTimes; i++) {
            executionsTime = executionsTime.concat(this._originalEvents
                .map(event => {
                    if (event.duration.end) {
                        return Random.random(event.duration.start, event.duration.end);
                    }
                    return event.duration.start;
                }));
        }

        return executionsTime;
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
        const connectionStatusText = this._simulationEnabled ?
            "Connected to the simulation mode."
            : "Connected to the Open BCI board.";
        this._socket.emit("IS_READY_TO_START_DATA_ACQUISITION", connectionStatusText, this._startDataAcquisition.bind(this))
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
                await this.stop();
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

            for (let i=0; i<sample.channelData.length; i++) {
                if (sample.channelData[i] !== 0) {
                    sample.channelData[i] = Math.log(Math.abs(sample.channelData[i]));
                }
            }
            this._writer.appendSample(sample, this._currentLabel);

            if (this._remainingSamples) {
                this._remainingSamples--;
                if (this._remainingSamples === 0) {
                    this._setUpNextRound();
                }
            } else if (this._samplesCount % this._frequency === 0) {
                this._currentEvent.elapsedTime++;
                const remainingTime = this._currentEvent.duration - this._currentEvent.elapsedTime;
                if (remainingTime > 0 && remainingTime < 1) {
                    this._remainingSamples = Math.round(this._frequency * remainingTime);
                } else if (remainingTime === 0) {
                   this._setUpNextRound();
                }
            }
        });
    }

    _setUpNextRound() {
        this._samplesCount = 0;
        if (this._events.length === 0) {
            if (this._loop || --this._loopTimes > 0) {
                this._events = lang.cloneDeep(this._originalEvents);
                if (this._loop) {
                    this._randomDirections = this._generateRandomDirections();
                    this._executionTimes = this._generateExecutionTimes();
                }
                this._startNextEvent();
            } else {
                this.stop();
            }
        } else {
            this._startNextEvent();
        }
    }

    _startNextEvent() {
        this._currentEvent = this._events.shift();
        this._currentEvent.direction = this._obtainEventDirection(this._currentEvent);
        this._currentEvent.duration = this._executionTimes.shift();
        this._currentEvent.elapsedTime = 0;
        this._currentLabel = EventType.getId(this._currentEvent.direction);
        this._socket.emit("SET_CURRENT_EVENT", this._currentEvent);
    }

    _obtainEventDirection(event) {
        if (event.direction === "LEFT_OR_RIGHT") {
            return EventType.getDescription(this._randomDirections.shift());
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

        if (this._maxSamplesCount) {
            console.log(`Writing ${this._maxSamplesCount} samples.`);
        } else {
            console.log("Writing samples");
        }
        await this._writer.write(this._maxSamplesCount);
        this._socket.emit("ON_MESSAGE", "The CSV file was successfully saved.");
    }

    async cleanUp() {
        console.log("Cleaning the stream resources");
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