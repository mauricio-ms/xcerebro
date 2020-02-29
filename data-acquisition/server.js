const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");

const ExceptionHandler = require("./modules/ExceptionHandler");
const index = require("./routes/index");
const Socket = require("./modules/Socket");

ExceptionHandler.setUp();

const app = express();
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/", index);

const server = http.createServer(app);
Socket.connect(server)
    .then(socketId => console.log(`New socket connection: ${socketId}`));

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port: ${port}`));
server.on("error", async error => {
    if (error.code === "EADDRINUSE") {
        console.log("Port already in use, killing the process.");
        const killPort = require("kill-port");
        await killPort(port, "tcp");
        server.listen(port, () => console.log(`Server running on port: ${port}`));
    }
});

module.exports = server;