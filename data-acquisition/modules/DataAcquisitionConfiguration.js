const array = require("lodash/array");

class DataAcquisitionConfiguration {
    constructor(events) {
        this._eventsSequence = 0;
        this.events = [];
        this.loop = false;
        this.loopTimes = 1;
        this.subject = 1;
        this.durationEvent = {
            start: null,
            end: null
        };
        this.frequency = 250;

        while(events.length > 0) {
            const event = events.shift();
            this.addEvent(event);
        }
    }

    addEvent(event) {
        event.id = String(this._eventsSequence++);
        this.events.push(event);
    }

    deleteEvent(eventId) {
        const eventIndex = array.findIndex(this.events, event => event.id === eventId);
        this.events.splice(eventIndex, 1);
    }
}

const preconfiguredEvents = [
    {
        direction: "REST",
        duration: {
            start: 1.75,
            end: 2.25
        }
    },
    {
        direction: "LEFT_OR_RIGHT",
        duration: {
            start: 3.5
        }
    }
];
module.exports = new DataAcquisitionConfiguration(preconfiguredEvents);