const Cyton = require("@openbci/cyton");
const ourBoard = new Cyton({
    verbose: true
});

ts = [];
ts_b = [];
d1 = null;
d2 = null;
time = 8000;

async function execute() {
    await ourBoard.connect("/dev/ttyUSB0");
    await ourBoard.syncRegisterSettings();
    await ourBoard.streamStart();
    const sync = await ourBoard.syncClocksFull();
    if (!sync.valid) {
       await ourBoard.syncClocksFull();
    }

    setTimeout(() => {
        d2 = new Date();
    }, time);

    ourBoard.on("sample", async sample => {
        ts.push(sample.timestamp);
        ts_b.push(sample.boardTime);

        if (ts_b.length > 0 && ts_b[ts_b.length-1]-ts_b[0] >= time-1) {
            d1 = new Date();
            ourBoard.removeAllListeners();
            await ourBoard.streamStop();
            await ourBoard.disconnect();
            console.log("stop");
            console.log(ts_b.length);
            console.log(ts_b[ts_b.length-1]-ts_b[0]);
            console.log(ts[ts.length-1]-ts[0]);
            console.log("DIFF: " + (d1.getTime() - d2.getTime()));
        }
    });
}

execute();