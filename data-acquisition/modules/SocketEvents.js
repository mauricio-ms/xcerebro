const DataAcquisitionConfiguration = require("./DataAcquisitionConfiguration");
const EegCsvWriter = require("./EegCsvWriter");
const StreamData = require("./StreamData");
const ExceptionHandler = require("./ExceptionHandler");

function configure(socket) {
    // Emit events to configure the window with server info
    socket.emit("EVENTS_ADDED", DataAcquisitionConfiguration.events);
    socket.emit("LOOP_CONFIGURED", DataAcquisitionConfiguration.loop);
    socket.emit("LOOP_TIMES_CONFIGURED", DataAcquisitionConfiguration.loopTimes);
    socket.emit("SUBJECT_CONFIGURED", DataAcquisitionConfiguration.subject);
    socket.emit("DURATION_EVENT_CONFIGURED", DataAcquisitionConfiguration.durationEvent);

    // Configure the events that must be listened by the server
    socket.on("ADD_EVENT", event => {
        if (!event.duration || (!event.duration.start && !event.duration.end)) {
            socket.emit("ON_MESSAGE", "At least the start duration of the event should be configured.");
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
    socket.on("CONFIGURE_DURATION_EVENT", durationEvent => {
        if (durationEvent.start) {
            DataAcquisitionConfiguration.durationEvent.start = durationEvent.start;
        }
        if (durationEvent.end) {
            DataAcquisitionConfiguration.durationEvent.end = durationEvent.end;
        }
    });

    let streamData = null;
    socket.on("START_DATA_ACQUISITION", async () => {
        if (!validateToStartDataAcquisition(socket)) {
            socket.emit("DATA_ACQUISITION_ENDED");
            return;
        }
        try {
            const writer = new EegCsvWriter(DataAcquisitionConfiguration.subject);
            streamData = new StreamData(DataAcquisitionConfiguration.events, DataAcquisitionConfiguration.loop,
                DataAcquisitionConfiguration.loopTimes, DataAcquisitionConfiguration.frequency, writer);
            ExceptionHandler.addHandler("cleanUp", streamData.cleanUp.bind(streamData));
            socket.emit("OPEN_DATA_ACQUISITION_MODAL");
            await streamData.start();
        } catch (e) {
            socket.emit("ON_MESSAGE", e.message);
            socket.emit("DATA_ACQUISITION_ENDED");
        }
    });

    socket.on("END_DATA_ACQUISITION", async () => await streamData.stop());
    socket.on("CLEAN_UP_DATA_ACQUISITION_RESOURCES", async () => {
        await streamData.cleanUp();
        socket.emit("DATA_ACQUISITION_ENDED");
    });
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