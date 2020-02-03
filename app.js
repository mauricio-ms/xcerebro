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
let events = [];

io.on("connection", socket => {
    socket.emit("ADD_EVENTS", events);

    socket.on("ADD_EVENT", event => {
        event.id = String(eventsSequence++);
        events.push(event);
        io.emit("NEW_EVENT", event);
    });

    socket.on("DELETE_EVENT", eventId => {
        let eventIndex = array.findIndex(events, event => event.id === eventId)
        events.splice(eventIndex, 1);
        io.emit("REMOVE_EVENT", eventId);
    });

    socket.on("START_DATA_ACQUISITION", () => {
        io.emit("EXECUTE_DATA_ACQUISITION", events);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port: ${port}`));

module.exports = app;