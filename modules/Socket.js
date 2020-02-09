const socketio = require("socket.io");
const SocketEvents = require("./SocketEvents");

let connection = null;

class Socket {
    constructor() {
        this._socket = null;
    }

    connect(server) {
        const io = socketio(server);

        return new Promise(resolve => {
            io.on("connection", socket => {
                this._socket = socket;
                SocketEvents.configure(socket);
                resolve(socket.id);
            });
        });
    }

    emit(event, data) {
        this._socket.emit(event, data);
    }

    on(event, handler) {
        this._socket.on(event, handler);
    }

    static init(server) {
        if (!connection) {
            connection = new Socket();
            return connection.connect(server);
        }
    }

    static getConnection() {
        if (!connection) {
            throw new Error("No active connection");
        }
        return connection;
    }
}

module.exports = {
    connect: Socket.init,
    getConnection: Socket.getConnection
};