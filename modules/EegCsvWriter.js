const moment = require("moment");
const createArrayCsvWriter = require("csv-writer").createArrayCsvWriter;
const array = require("lodash/array");

class EegCsvWriter {
    constructor(subjectNumber) {
        const date = moment().format("YYYY-MM-DD_H-mm");
        this.path = `data/${date}_eeg_subject-${subjectNumber}.csv`;
        this.csvWriter = createArrayCsvWriter({
            path: this.path,
            header: ["TIMESTAMP", "CHANNEL_1", "CHANNEL_2", "CHANNEL_3", "CHANNEL_4",
                "CHANNEL_5", "CHANNEL_6", "CHANNEL_7", "CHANNEL_8", "CLASS_DATA"]
        });
        this.records = [];
    }

    appendSample(sample) {
        const record = array.flatten([sample.timestamp, sample.channelData, 1]);
        this.records.push(record);
    }

    async write() {
        await this.csvWriter.writeRecords(this.records);
        console.log("The CSV file was written successfully in: " + this.path);
    }
}

module.exports = EegCsvWriter;