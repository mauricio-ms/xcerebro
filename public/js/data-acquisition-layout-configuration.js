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

socket.on("ON_MESSAGE", message => alert(message));