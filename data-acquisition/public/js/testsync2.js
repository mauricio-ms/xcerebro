const Cyton = require("@openbci/cyton");
const k = require("@openbci/utilities").constants;
const ourBoard = new Cyton({
    verbose: true
});

const resyncPeriodMin = 1; // re sync every five minutes
const secondsInMinute = 60;
let sampleRate = k.OBCISampleRate250; // Default to 250, ALWAYS verify with a call to `.sampleRate()` after 'ready' event!
let timeSyncPossible = false;

count = 0;

// Call to connect
ourBoard
    .connect("/dev/ttyUSB0")
    .then(() => {
        // Get the sample rate after 'ready'
        sampleRate = ourBoard.sampleRate();
        // Find out if you can even time sync, you must be using v2 and this is only accurate after a `.softReset()` call which is called internally on `.connect()`. We parse the `.softReset()` response for the presence of firmware version 2 properties.
        timeSyncPossible = ourBoard.usingVersionTwoFirmware();
        console.log("timeSyncPossible: " + timeSyncPossible);
        ourBoard
            .streamStart()
            .then(() => {
                /** Start streaming command sent to board. */
                setInterval(() => {
                    console.log(count);
                }, 1000);
            })
            .catch(err => {
                console.log(`stream start: ${err}`);
            });

        // PTW recommends sample driven
        ourBoard.on("sample", sample => {
            console.log(sample.boardTime);
            count = sample._count;
            // Resynchronize every every 5 minutes
            if (
                sample._count %
                (sampleRate * resyncPeriodMin * secondsInMinute) ===
                0
            ) {
                ourBoard.syncClocksFull().then(syncObj => {
                    // Sync was successful
                    if (syncObj.valid) {
                        // Log the object to check it out!
                        console.log(`syncObj`, syncObj);

                        // Sync was not successful
                    } else {
                        // Retry it
                        console.log(`Was not able to sync, please retry?`);
                    }
                });
            }

            if (sample.timeStamp) {
                // true after the first sync
                console.log(`NTP Time Stamp ${sample.timeStamp}`);
            }
        });
    })
    .catch(err => {
        console.log(`connect: ${err}`);
    });