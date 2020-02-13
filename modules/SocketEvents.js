const DataAcquisitionConfiguration = require("./DataAcquisitionConfiguration");
const EegCsvWriter = require("./EegCsvWriter");
const StreamData = require("./StreamData");

function configure(socket) {
    // Emit events to configure the window with server info
    socket.emit("EVENTS_ADDED", DataAcquisitionConfiguration.events);
    socket.emit("LOOP_CONFIGURED", DataAcquisitionConfiguration.loop);
    socket.emit("LOOP_TIMES_CONFIGURED", DataAcquisitionConfiguration.loopTimes);
    socket.emit("SUBJECT_CONFIGURED", DataAcquisitionConfiguration.subject);
    socket.emit("DURATION_EVENT_CONFIGURED", DataAcquisitionConfiguration.durationEvent);

    // Configure the events that must be listened by the server
    socket.on("ADD_EVENT", event => {
        if (!event.duration) {
            socket.emit("ON_MESSAGE", "The duration of the event should be configured.");
            return;
        }
        DataAcquisitionConfiguration.addEvent(event);
        socket.emit("EVENT_ADDED", event);
    });

    socket.on("DELETE_EVENT", eventId => {
        DataAcquisitionConfiguration.deleteEvent(eventId);
        socket.emit("EVENT_DELETED", eventId);
    });

    socket.on("CONFIGURE_LOOP", loop => DataAcquisitionConfiguration.loop = loop);
    socket.on("CONFIGURE_LOOP_TIMES", loopTimes => DataAcquisitionConfiguration.loopTimes = loopTimes);
    socket.on("CONFIGURE_SUBJECT", subject => DataAcquisitionConfiguration.subject = subject);
    socket.on("CONFIGURE_DURATION_EVENT", durationEvent => DataAcquisitionConfiguration.durationEvent = durationEvent);

    let streamData = null;
    socket.on("START_DATA_ACQUISITION", async () => {
        if (!validateToStartDataAcquisition(socket)) {
            socket.emit("DATA_ACQUISITION_ENDED");
            return;
        }
        try {
            const writer = new EegCsvWriter(DataAcquisitionConfiguration.subject);
            streamData = new StreamData(DataAcquisitionConfiguration.events, DataAcquisitionConfiguration.loop,
                DataAcquisitionConfiguration.loopTimes, DataAcquisitionConfiguration.getTimeExecution(),
                DataAcquisitionConfiguration.frequency, writer);
            socket.emit("OPEN_DATA_ACQUISITION_MODAL");
            await streamData.start();
        } catch (e) {
            socket.emit("ON_MESSAGE", e.message);
            socket.emit("DATA_ACQUISITION_ENDED");
        }
    });

    socket.on("END_DATA_ACQUISITION", async () => await streamData.stop());
}

function validateToStartDataAcquisition(socket) {
    if (!DataAcquisitionConfiguration.subject) {
        socket.emit("ON_MESSAGE", "The subject should be configured.");
        return false;
    }

    return true;
}

module.exports = {
    configure: configure
};