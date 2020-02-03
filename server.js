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

let eventsSequence = 0;
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
let events = [];

io.on("connection", socket => {
    for (let i=0; i<preconfiguredEvents.length; i++) {
        const preconfiguredEvent = preconfiguredEvents.shift()
        preconfiguredEvent.id = String(eventsSequence++);
        events.push(preconfiguredEvent);
    }

    socket.emit("EVENTS_ADDED", events);

    socket.on("ADD_EVENT", event => {
        event.id = String(eventsSequence++);
        events.push(event);
        io.emit("EVENT_ADDED", event);
    });

    socket.on("DELETE_EVENT", eventId => {
        let eventIndex = array.findIndex(events, event => event.id === eventId)
        events.splice(eventIndex, 1);
        io.emit("EVENT_DELETED", eventId);
    });

    socket.on("START_DATA_ACQUISITION", () => {
        io.emit("DATA_ACQUISITION_STARTED", events);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port: ${port}`));

module.exports = server;