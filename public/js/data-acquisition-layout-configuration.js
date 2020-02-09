socket.on("ON_MESSAGE", message => alert(message));

const loopCb = document.getElementById("loop-cb");
loopCb.addEventListener("change", function() {
    socket.emit("CONFIGURE_LOOP", this.checked);
    switchElement("loop-times-input", !this.checked);
});
socket.on("LOOP_CONFIGURED", loop => {
    loopCb.checked = loop;
    switchElement("loop-times-input", !loop);
});

const loopTimesInput = document.getElementById("loop-times-input");
loopTimesInput.addEventListener("change", function() {
    socket.emit("CONFIGURE_LOOP_TIMES", this.valueAsNumber);
});
socket.on("LOOP_TIMES_CONFIGURED", loopTimes => loopTimesInput.value = loopTimes);

const subjectInput = document.getElementById("subject-input");
subjectInput.addEventListener("change", function() {
    socket.emit("CONFIGURE_SUBJECT", this.valueAsNumber);
});
socket.on("SUBJECT_CONFIGURED", subject => subjectInput.value = subject);

const durationEventInput = document.getElementById("duration-event-input");
durationEventInput.addEventListener("change", function() {
    socket.emit("CONFIGURE_DURATION_EVENT", this.valueAsNumber);
});
socket.on("DURATION_EVENT_CONFIGURED", durationEvent => durationEventInput.value = durationEvent);