const Cyton = require("@openbci/cyton");
const ourBoard = new Cyton({
    verbose: true
});

async function execute() {
    const ts = [];
    const ts_b = [];
    let d1 = null;
    let d2 = null;
    let started = false;

    await ourBoard.connect("/dev/ttyUSB0");
    await ourBoard.syncRegisterSettings();
    await ourBoard.streamStart();
    const sync = await ourBoard.syncClocksFull();
    if (!sync.valid) {
       await ourBoard.syncClocksFull();
    }

    ourBoard.on("sample", async sample => {
        if (!started) {
            setTimeout(async () => {
                ourBoard.removeAllListeners();
                await ourBoard.streamStop();
                await ourBoard.disconnect();
                console.log("stop");
                console.log(ts_b.length);
                console.log(ts_b[ts_b.length-1]-ts_b[0]);
                console.log(ts[ts.length-1]-ts[0]);
            }, 2000);
        }
        started = true;
        ts.push(sample.timestamp);
        ts_b.push(sample.boardTime);
    });
}

execute();