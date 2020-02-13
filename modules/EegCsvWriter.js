const moment = require("moment");
const fs = require("fs");
const createArrayCsvWriter = require("csv-writer").createArrayCsvWriter;
const array = require("lodash/array");

class EegCsvWriter {
    constructor(subject) {
        const date = moment().format("YYYY-MM-DD_HH-mm");
        this.path = `data/${date}_eeg_subject-${subject}.csv`;
        if (fs.existsSync(this.path)) {
            throw new Error("The csv file already exists. Wait to start a new recording or switch the subject.");
        }
        this._csvWriter = createArrayCsvWriter({
            path: this.path,
            header: ["TIMESTAMP", "CHANNEL_1", "CHANNEL_2", "CHANNEL_3", "CHANNEL_4",
                "CHANNEL_5", "CHANNEL_6", "CHANNEL_7", "CHANNEL_8", "EVENT"]
        });
        this._records = [];
    }

    appendSample(sample, event) {
        const record = array.flatten([sample.timestamp, sample.channelData, event]);
        this._records.push(record);
    }

    async write(quantityRecords) {
        await this._csvWriter.writeRecords(this.getRecords(quantityRecords));
        this._records = [];
        console.log("The CSV file was successfully saved on path: " + this.path);
    }

    getRecords(quantityRecords) {
        if (quantityRecords === 0 || quantityRecords === this._records.length) {
            return this._records;
        } else if (quantityRecords > this._records.length) {
            console.warn(`The records that will be write is less than ${quantityRecords}`);
            return this._records;
        } else {
            return this._records.splice(0, quantityRecords);
        }
    }
}

module.exports = EegCsvWriter;