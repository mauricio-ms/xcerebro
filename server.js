const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const array = require("lodash/array");

const index = require("./routes/index");

const app = express();
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/", index);

const server = http.createServer(app);
const io = socketio(server);

let preconfiguredEvents = [
    {
        direction: "REST",
        duration: 3
    },
    {
        direction: "LEFT",
        duration: 7
    }
];

let configuration = {
    eventsSequence: 0,
    events: [],
    loop: false,
    loopTimes: null
};

io.on("connection", socket => {
    // Configure some events
    while(preconfiguredEvents.length > 0) {
        const preconfiguredEvent = preconfiguredEvents.shift();
        preconfiguredEvent.id = String(configuration.eventsSequence++);
        configuration.events.push(preconfiguredEvent);
    }

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
        let eventIndex = array.findIndex(configuration.events, event => event.id === eventId);
        configuration.events.splice(eventIndex, 1);
        socket.emit("EVENT_DELETED", eventId);
    });

    socket.on("CONFIGURE_LOOP", loop => configuration.loop = loop);
    socket.on("CONFIGURE_LOOP_TIMES", loopTimes => configuration.loopTimes = loopTimes);

    socket.on("START_DATA_ACQUISITION", () => socket.emit("DATA_ACQUISITION_STARTED", configuration.events));
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port: ${port}`));

module.exports = server;