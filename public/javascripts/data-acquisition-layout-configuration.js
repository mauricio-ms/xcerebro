const loopCb = document.getElementById("loop-cb");
loopCb.addEventListener("change", function() {
    switchElement("loop-times", !this.checked);
});