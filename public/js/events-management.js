const events = document.getElementById("events-queue");

const DirectionEnum = {
    "LEFT": "Left",
    "REST": "Rest",
    "RIGHT": "Right",
    "LEFT_OR_RIGHT": "Left or Right"
};

socket.on("EVENTS_ADDED", events => events.forEach(event => addEvent(event)));
socket.on("EVENT_ADDED", event => addEvent(event));
socket.on("EVENT_DELETED", eventId => deleteEvent(eventId));

function sendAddLeftEventMessage() {
    sendAddEventMessage("LEFT");
}

function sendAddRestEventMessage() {
    sendAddEventMessage("REST");
}

function sendAddRightEventMessage() {
    sendAddEventMessage("RIGHT");
}

function sendAddLeftOrRightEventMessage() {
    sendAddEventMessage("LEFT_OR_RIGHT");
}

function sendAddEventMessage(direction) {
    socket.emit("ADD_EVENT", {
        direction: direction,
        duration: document.getElementById("duration-event-input").valueAsNumber
    });
}

function addEvent(event) {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";
    listItem.dataset.index = event.id;

    const directionsIcon = createIcon("text-muted fas fa-arrows-alt-h");

    const contentText = ` ${DirectionEnum[event.direction]} ${event.duration}s `;
    const content = document.createTextNode(contentText);

    const deleteLink = document.createElement("a");
    deleteLink.className = "text-danger";
    deleteLink.append(createIcon("fas fa-trash-alt"));
    deleteLink.onclick = sendDeleteEventMessage(event.id);

    listItem.appendChild(directionsIcon);
    listItem.appendChild(content);
    listItem.appendChild(deleteLink);

    events.appendChild(listItem);
}

function createIcon(className) {
    const icon = document.createElement("i");
    icon.className = className;

    return icon;
}

function sendDeleteEventMessage(eventId) {
    return () => socket.emit("DELETE_EVENT", eventId);
}

function deleteEvent(eventId) {
    events.removeChild(_.find(events.childNodes, e => e.dataset && e.dataset.index === eventId));
}