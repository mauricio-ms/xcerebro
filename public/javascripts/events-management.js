const events = document.getElementById("events-queue");

socket.on("ADD_EVENTS", events => events.forEach(event => addEvent(event)));
socket.on("NEW_EVENT", event => addEvent(event));
socket.on("REMOVE_EVENT", eventId => deleteEvent(eventId));

function sendAddLeftEventMessage() {
    sendAddEventMessage("LEFT");
}

function sendAddRestEventMessage() {
    sendAddEventMessage("REST");
}

function sendAddRightEventMessage() {
    sendAddEventMessage("RIGHT");
}

function sendAddEventMessage(direction) {
    socket.emit("ADD_EVENT", {
        direction: direction,
        duration: document.getElementById("duration-event").valueAsNumber || 10
    });
    document.getElementById("duration-event").value = 10;
}

function addEvent(event) {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";
    listItem.dataset.index = event.id;

    const directionsIcon = createIcon("text-muted fas fa-arrows-alt-h");

    const directionText = event.direction.charAt(0).toUpperCase() + event.direction.toLowerCase().slice(1);
    const contentText = ` ${directionText} ${event.duration}s `;
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