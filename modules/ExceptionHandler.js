const handlers = {};

function addHandler(handlerName, handler) {
    if (!handler instanceof Function) {
        throw Error("The parameter 'handler' should be callable.");
    }
    handlers[handlerName] = handler;
}

async function executeHandlers() {
    for (let handlerName of Object.keys(handlers)) {
        await handlers[handlerName]();
    }
}

function setUp() {
    // Do something when app is closing
    process.on("exit", executeHandlers);

    // Catches ctrl+c event
    process.on("SIGINT", executeHandlers);

    // Catches uncaught exceptions
    process.on("uncaughtException", async error => {
        console.error("Unexpected error\n", error);
        await executeHandlers();
        process.exit(1);
    });
}

module.exports = {
    setUp: setUp,
    addHandler: addHandler
};