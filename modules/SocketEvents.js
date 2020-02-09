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
    loopTimes: null
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

    // Configure the events that must be listened by the server
    socket.on("ADD_EVENT", event => {
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

    const streamData = new StreamData(configuration.events);
    socket.on("START_DATA_ACQUISITION", () => streamData.start());

    socket.on("END_DATA_ACQUISITION", async () => {
        await streamData.stop();
        socket.emit("DATA_ACQUISITION_ENDED");
        console.log("Streaming ended ...");
    });
}

module.exports = {
    configure: configure
};