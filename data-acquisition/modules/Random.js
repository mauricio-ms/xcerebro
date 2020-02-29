function random(minimum, maximum) {
    return Math.random() * (maximum - minimum) + minimum;
}

function randomInt(minimum, maximum) {
    return minimum + Math.floor((maximum + 1 - minimum) * Math.random());
}

module.exports = {
    random: random,
    randomInt: randomInt
};