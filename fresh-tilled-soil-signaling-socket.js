var portNumber = 1337;
var WebSocketServer = require('websocket').server;
var http = require('http');
var clients = [];
var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});
server.listen(portNumber, function() {
  console.log((new Date()) + " Server is listening on port " + portNumber);
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}

function broadcastNumberOfPeers(occupantNumber) {
  // broadcast message to all connected clients
  clients.forEach(function (outputConnection) {
        outputConnection.send('{ "type": "peerCount", "data": ' + occupantNumber + ' }', sendCallback);
  });
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {

    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    console.log(' Connection ' + connection.remoteAddress);

    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;


    broadcastNumberOfPeers(clients.length);

	    	console.log('================================');
	    	console.log(request.resourceURL.query);
	    	console.log('================================');

	  // add room name to this client index here
	  clients[index].roomName = request.resourceURL.query.room;


    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {

        if (message.type === 'utf8') {

	      var msg = JSON.parse(message.utf8Data);


            // process WebSocket message
            console.log((new Date()) + ' Received Message ' + message.utf8Data);


            // broadcast message to all connected clients
            clients.forEach(function (outputConnection) {
                if (outputConnection != connection) {
                  outputConnection.send(message.utf8Data, sendCallback);
                }
            });

        }
    });

    connection.on('close', function(connection) {
        // close user connection
        console.log((new Date()) + " Peer disconnected.");

        // remove user from the list of connected clients
        clients.splice(index, 1);

        console.log(clients.length);

        broadcastNumberOfPeers(clients.length);

    });
});
