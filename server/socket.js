const chalk = require('chalk');
const { Map } = require('immutable');
const store = require('./redux/store');

const { createAndEmitUser, updateUserData, removeUserAndEmit } = require('./redux/reducers/user-reducer');
const { addRoom, addSocket, removeSocket } = require('./redux/reducers/room-reducer');

const { getOtherUsers } = require('./utils');
const rooms = {}; // nested object representing state of all chat rooms and all users within each chat room.
const sockets = {}; // Stores all sockets with key of the socket.id

module.exports = io => {
  io.on('connection', socket => {
    console.log(chalk.yellow(`${socket.id} has connected`));
    // When a socket client establishes a conenction, create and persist a user
    //   for the client and return the user upon receipt of the sceneLoad event
    store.dispatch(createAndEmitUser(socket));
    sockets[socket.id] = socket;

    // getOthers returns all users other the the user associated with the socket
    //   client that made the request.
    socket.on('getOthers', () => {
      const allUsers = store.getState().users;
      socket.emit('getOthersCallback', getOtherUsers(allUsers, socket.id));
    });

    // Currently unused lifecycle hook that occurs after a client perform the initial
    //   render of all of the avatars but before starting to emit avatar updates to
    //   the server. This is intended to be used to allow the server the ability
    //   to potentially throttle the client's rate of updates to the server.
    // Note that the startTick event listener is located in the publish-location
    //   A-Frame component located at /browser/aframeComponents/publish-location.js
    socket.on('haveGottenOthers', () => {
      socket.emit('startTick');
    });

    // readyToReceiveUpdates sends the position of all users except the client's own
    //   whenever the server's store updates.
    socket.on('readyToReceiveUpdates', () => {
      store.subscribe(() => {
        const allUsers = store.getState().users;
        socket.emit('usersUpdated', getOtherUsers(allUsers, socket.id));
      });
    });

    // On each tick update from a client, update the store, which trigger the subscriptions created for each
    //   client in the event handler for 'readyToReceiveUpdates'
    socket.on('tick', userData => {
      userData = Map(userData);
      store.dispatch(updateUserData(userData));
    });

    // When a socket disconnects, removes the user from the store, broadcast 'removeUser' to all
    //   clients, and remove the socket from any socket.io rooms or WebRTC P2P connections
    socket.on('disconnect', () => {
      store.dispatch(removeUserAndEmit(socket));
      console.log(chalk.magenta(`${socket.id} has disconnected`));
      leaveChatRoom();
      console.log(`[${socket.id}] disconnected`);
      delete sockets[socket.id];
    });

    // joinChatRoom joins a socket.io room and tells all clients in that room to establish a WebRTC
    //   connetions with the person entering the room.
    socket.on('joinChatRoom', function (room) {
      console.log(`[${socket.id}] join ${room}`);
      if (!(store.getState().rooms.has(room))) {
        console.log(`Adding ${room} to state`);
        store.dispatch(addRoom(room));
      }
      store.getState().rooms.get(room).valueSeq().forEach(peer => {
        peer.emit('addPeer', { 'peer_id': socket.id, 'should_create_offer': false });
        socket.emit('addPeer', { 'peer_id': peer.id, 'should_create_offer': true });
      });
      store.dispatch(addSocket(room, socket));
      socket.join(room);
      socket.currentChatRoom = room;
    });

    // leaveChatRoom leaves the current socket.io room and tells all clients to tear down WebRTC
    //   connections with the person leaving the room.
    function leaveChatRoom () {
      const room = socket.currentChatRoom;
      if (room) {
        console.log(`[${socket.id}] leaveChatRoom ${room}`);
        socket.leave(room);
        store.dispatch(removeSocket(room, socket));
        store.getState().rooms.get(room).valueSeq().forEach(peer => {
          peer.emit('removePeer', { 'peer_id': socket.id });
          socket.emit('removePeer', { 'peer_id': peer.id });
        });
        socket.currentChatRoom = null;
      } else {
        console.log('Not currently in room, so nothing to leave');
      }
    }
    socket.on('leaveChatRoom', () => leaveChatRoom());

    // If any user is an Ice Candidate, tells other users to set up a ICE connection with them
    socket.on('relayICECandidate', function (config) {
      const peerId = config.peer_id;
      const iceCandidate = config.ice_candidate;
      console.log(`[${socket.id}] relaying ICE candidate to [${peerId}] ${iceCandidate}`);

      if (peerId in sockets) {
        sockets[peerId].emit('iceCandidate', { 'peer_id': socket.id, 'ice_candidate': iceCandidate });
      }
    });

    // Send the answer back to the new user in order to complete the handshake
    socket.on('relaySessionDescription', function (config) {
      const peerId = config.peer_id;
      const sessionDescription = config.session_description;
      console.log(`[${socket.id}] relaying session description to [${peerId}] ${sessionDescription}`);

      if (peerId in sockets) {
        sockets[peerId].emit('sessionDescription', { 'peer_id': socket.id, 'session_description': sessionDescription });
      }
    });
  });
};
