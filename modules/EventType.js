const DescriptionById = {
    0: "REST",
    1: "LEFT",
    2: "RIGHT"
};

const IdByDescription = {
    "REST": 0,
    "LEFT": 1,
    "RIGHT": 2
};

function getId(eventDescription) {
    return IdByDescription[eventDescription];
}

function getDescription(eventId) {
    return DescriptionById[eventId];
}

module.exports = {
    getId: getId,
    getDescription: getDescription
};