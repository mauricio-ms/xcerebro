const array = require("lodash/array");

const StreamData = require("./StreamData");

const preconfiguredEvents = [
    {
        direction: "REST",
        duration: 3
    },
    {
        direction: "LEFT",
        duration: 6
    }
];

const configuration = {
    eventsSequence: 0,
    events: [],
    loop: false,
    loopTimes: 10,
    subject: 1,
    durationEvent: 10
};

while(preconfiguredEvents.length > 0) {
    const preconfiguredEvent = preconfiguredEvents.shift();
    preconfiguredEvent.id = String(configuration.eventsSequence++);
    configuration.events.push(preconfiguredEvent);
}

function configure(socket) {
    // Emit events to configure the window with server info
    socket.emit("EVENTS_ADDED", configuration.events);
    socket.emit("LOOP_CONFIGURED", configuration.loop);
    socket.emit("LOOP_TIMES_CONFIGURED", configuration.loopTimes);
    socket.emit("SUBJECT_CONFIGURED", configuration.subject);
    socket.emit("DURATION_EVENT_CONFIGURED", configuration.durationEvent);

    // Configure the events that must be listened by the server
    socket.on("ADD_EVENT", event => {
        if (!event.duration) {
            socket.emit("ON_MESSAGE", "The duration of the event should be configured.");
            return;
        }
        event.id = String(configuration.eventsSequence++);
        configuration.events.push(event);
        socket.emit("EVENT_ADDED", event);
    });

    socket.on("DELETE_EVENT", eventId => {
        const eventIndex = array.findIndex(configuration.events, event => event.id === eventId);
        configuration.events.splice(eventIndex, 1);
        socket.emit("EVENT_DELETED", eventId);
    });

    socket.on("CONFIGURE_LOOP", loop => configuration.loop = loop);
    socket.on("CONFIGURE_LOOP_TIMES", loopTimes => configuration.loopTimes = loopTimes);
    socket.on("CONFIGURE_SUBJECT", subject => configuration.subject = subject);
    socket.on("CONFIGURE_DURATION_EVENT", durationEvent => configuration.durationEvent = durationEvent);

    const streamData = new StreamData(configuration.events);
    socket.on("START_DATA_ACQUISITION", () => {
        if (!validateToStartDataAcquisition(socket)) {
            socket.emit("DATA_ACQUISITION_ENDED");
            return;
        }
        streamData.start(configuration.subject);
    });

    socket.on("END_DATA_ACQUISITION", async () => {
        await streamData.stop();
        socket.emit("DATA_ACQUISITION_ENDED");
        console.log("Streaming ended.");
    });
}

function validateToStartDataAcquisition(socket) {
    if (!configuration.subject) {
        socket.emit("ON_MESSAGE", "The subject should be configured.");
        return false;
    }

    return true;
}

module.exports = {
    configure: configure
};