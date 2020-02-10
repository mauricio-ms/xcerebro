const moment = require("moment");
const createArrayCsvWriter = require("csv-writer").createArrayCsvWriter;
const array = require("lodash/array");

class EegCsvWriter {
    constructor(subject) {
        const date = moment().format("YYYY-MM-DD_HH-mm");
        this.path = `data/${date}_eeg_subject-${subject}.csv`;
        this.csvWriter = createArrayCsvWriter({
            path: this.path,
            header: ["TIMESTAMP", "CHANNEL_1", "CHANNEL_2", "CHANNEL_3", "CHANNEL_4",
                "CHANNEL_5", "CHANNEL_6", "CHANNEL_7", "CHANNEL_8", "EVENT"]
        });
        this.records = [];
    }

    appendSample(sample, event) {
        const record = array.flatten([sample.timestamp, sample.channelData, event]);
        this.records.push(record);
    }

    async write() {
        await this.csvWriter.writeRecords(this.records);
        console.log("The CSV file was written successfully in: " + this.path);
    }
}

module.exports = EegCsvWriter;