const array = require("lodash/array");

class DataAcquisitionConfiguration {
    constructor(events) {
        this._eventsSequence = 0;
        this.events = [];
        this.loop = false;
        this.loopTimes = 1;
        this.subject = 1;
        this.durationEvent = 10;
        this.frequency = 250;

        while(events.length > 0) {
            const event = events.shift();
            this.addEvent(event);
        }
    }

    addEvent(event) {
        event.id = String(this._eventsSequence++);
        event.elapsedTime = 0;
        event.samplesCount = this.frequency * event.duration;
        this.events.push(event);
    }

    deleteEvent(eventId) {
        const eventIndex = array.findIndex(this.events, event => event.id === eventId);
        this.events.splice(eventIndex, 1);
    }

    getTimeExecution() {
        return this.events
            .map(e => e.duration)
            .reduce((x, y) => x + y);
    }
}

const preconfiguredEvents = [
    {
        direction: "REST",
        duration: 2
    },
    {
        direction: "LEFT_OR_RIGHT",
        duration: 4
    }
];
module.exports = new DataAcquisitionConfiguration(preconfiguredEvents);