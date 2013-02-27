// --------------------------------------------------------------------------------------------
// freshTilledSoil_WebRTC - Constructor
// --------------------------------------------------------------------------------------------

/**
 * A constructor function that creates an instance of a webRTC session.
 *
 * @param {settingObject} contains optional configurable settings.
 *
 * Author: Paul Greenlea
 * Company: Fresh Tilled Soil
 * Date Created: Thu, Feb 14, 2013
 * Version: 1.2 (Tue, Feb 26, 2013)
 */
var freshTilledSoil_WebRTC = function (settingsObject) {

    // --------------------------------------------------------------------------------------------
    // Variables
    // --------------------------------------------------------------------------------------------

    var isEnabled = true,
        sessionStarted = false,

        socket = null,
        localStream = null,
        remoteStream = null,

        peerConn = null,
        isRTCPeerConnection = true,

        scope = this;

    // --------------------------------------------------------------------------------------------
    // Properties
    // --------------------------------------------------------------------------------------------

    this.DEFAULTS = {
	    	socketServerRoomName: '', // room name for this particular connection
        socketServerAddress: 'ws://onepaul.local:1337', // websocket server address
        stunServer: 'stun.l.google.com:19302', // STUN/ICE server address

        connectionIndicator: document.getElementById('connectionIndicator'), // element for displaying connected status

        sourceVideo: document.getElementById('sourcevid'), // local video element
        remoteVideo: document.getElementById('remotevid'), // remote video element

        btnStartVideo: document.getElementById('btn1'), // start video button element
        btnStopVideo: document.getElementById('btn2'), // stop video button element
        btnConnect: document.getElementById('btn3'), // connect to peer button element
        btnDisconnect: document.getElementById('btn4'), // disconnect from peer button element

        mediaConstraints: {
            'mandatory': {
                'OfferToReceiveAudio': true, // allow audio
                'OfferToReceiveVideo': true // allow video
            }
        }

    };

    /* merge defaults with passed in settings */
    this.SETTINGS = mergeOptions(this.DEFAULTS, settingsObject);



    // determine chat room - default to 'freshtilledsoil-1' if there is not entered room
    this.room = getUrlVars()["room"] || 'freshtilledsoil-' + guid();

    // create new websocket instance
    socket = new WebSocket(scope.SETTINGS.socketServerAddress + '/?room=' + scope.room );


    // --------------------------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------------------------


    /* function to create random chat room identifier if one is not provided */
		function guid() {
		  return s4() + s4() + s4();

	    function s4() {
			  return Math.floor((1 + Math.random()) * 0x10000)
			             .toString(16)
			             .substring(1);
			}

		}

    /* function to get the url keys / parameters */
			function getUrlVars() {
			    var vars = {};
			    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			        vars[key] = value;
			    });
			    return vars;
			}

    /* function to send the message to websocket server */
    function sendMessage(message) {
        var mymsg = JSON.stringify(message);
        //console.log("SEND: " + mymsg);
        socket.send(mymsg);
    }

    /* function to create peer connection */
    function createPeerConnection() {
        try {
            //console.log("Creating peer connection");
            var servers = [];
            servers.push({
                'url': 'stun:' + scope.SETTINGS.stunServer
            });
            var pc_config = {
                'iceServers': servers
            };
            peerConn = new webkitRTCPeerConnection(pc_config);
            peerConn.onicecandidate = onIceCandidate;
        } catch (e) {
            try {
                peerConn = new RTCPeerConnection('STUN ' + scope.SETTINGS.stunServer, onIceCandidate00);
                isRTCPeerConnection = false;
            } catch (e) {
                console.log("Failed to create PeerConnection, exception: " + e.message);
            }
        }

        // attach peer connection event listeners
        peerConn.onaddstream = onRemoteStreamAdded;
        peerConn.onremovestream = onRemoteStreamRemoved;
    }

    /* function for when remote adds a stream, hand the stream on to the local video element */
    function onRemoteStreamAdded(event) {
        //console.log("Added remote stream");
        scope.SETTINGS.remoteVideo.src = window.webkitURL.createObjectURL(event.stream);
        remoteStream = event.stream;

        console.log(event);
        waitForRemoteVideo();

    }


   function waitForLocalVideo() {
	   if (localStream.videoTracks.length === 0 || scope.SETTINGS.sourceVideo.currentTime > 0) {

		   console.log('local video streaming...');

		   //connect(); //--for auto connecting upon start up
		   //alert(localStream.audioTracks.length);

/*    NO LONGER DOING IT THIS WAY
			// tell server what room to place you in
	    sendMessage({
                type: 'room',
                data: scope.room
            });
*/

	   } else {
		   console.log('waiting for local video...');
		   setTimeout(waitForLocalVideo, 100);
	   }
	 }

   function waitForRemoteVideo() {
    if (remoteStream.videoTracks.length === 0 || scope.SETTINGS.remoteVideo.currentTime > 0) {
   //   transitionToActive();
		   console.log('remote video streaming...');

/*         alert(remoteStream.audioTracks.length); */

        //alert(remoteStream.audioTracks[0].enabled);

    } else {
		   console.log('waiting for remote video...');
      setTimeout(waitForRemoteVideo, 100);
    }
  }

/*
  // Todo - complete this functionality
  function transitionToActive() {
    remotevid.style.opacity = 1;
    card.style.webkitTransform = "rotateY(180deg)";
    setTimeout(function() { sourcevid.src = ""; }, 500);
    setStatus("<input type=\"button\" id=\"hangup\" value=\"Hang up\" onclick=\"onHangup()\" />");
  }
*/

    /* function for when remote client removes a stream, remove the stream from the local video element */
    function onRemoteStreamRemoved(event) {
        //console.log("Remove remote stream");
        scope.SETTINGS.remoteVideo.src = "";
    }

    /* function to send ICE candidate information onto websocket server */
    function onIceCandidate(event) {
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        } else {
            //console.log("End of candidates.");
        }
    }

    /* function (alternate) to send ICE candidate information onto websocket server (can handle more than one candidate) */
    function onIceCandidate00(candidate, moreToFollow) {
        if (candidate) {
            sendMessage({
                type: 'candidate',
                label: candidate.label,
                candidate: candidate.toSdp()
            });
        }
        if (!moreToFollow) {
            //console.log("End of candidates.");
        }
    }

    /* function to handle communication received via websocket (or the signaling server) */
    function onMessage(evt) {

        console.log("RECEIVED: " + evt.data);
        if (isRTCPeerConnection) {
            processSignalingMessage(evt.data);
        } else {
            processSignalingMessage00(evt.data);
        }

    }

    /* function that handles incoming signaling messages */
    function processSignalingMessage(message) {
        var msg = JSON.parse(message);
        // for 'offer' messages
        if (msg.type === 'offer') {
            if (!sessionStarted && localStream) {
                createPeerConnection();
                //console.log('Adding local stream...');
                // Todo - Think about making this a different color than that of the offerer
                turnOnConnectedIndicator();
                peerConn.addStream(localStream);
                sessionStarted = true;
                //console.log("isRTCPeerConnection: " + isRTCPeerConnection);

                // Create answer to session offer
                if (isRTCPeerConnection) {
                    // set remote description
                    peerConn.setRemoteDescription(new RTCSessionDescription(msg));
                    // create answer
                    //console.log("Sending answer to peer.");
                    peerConn.createAnswer(setLocalAndSendMessage, null, scope.SETTINGS.mediaConstraints);
                } else {
                    //set remote description
                    peerConn.setRemoteDescription(peerConn.SDP_OFFER, new SessionDescription(msg.sdp));
                    //create answer
                    var offer = peerConn.remoteDescription;
                    var answer = peerConn.createAnswer(offer.toSdp(), scope.SETTINGS.mediaConstraints);
                    //console.log("Sending answer to peer.");
                    setLocalAndSendMessage00(answer);
                }
            }

            // for 'answer' messages
        } else if (msg.type === 'answer' && sessionStarted) {
            peerConn.setRemoteDescription(new RTCSessionDescription(msg));

            // for 'candidate' messages
        } else if (msg.type === 'candidate' && sessionStarted) {
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: msg.label,
                candidate: msg.candidate
            });
            peerConn.addIceCandidate(candidate);

            // Todo - for 'chat' messages
        } else if (msg.type == 'chat') {
            addChatMsg(msg.nick, msg.cid, msg.data);

            // for 'bye' messages (or remote hangups)
        } else if (msg.type === 'bye' && sessionStarted) {
            onRemoteHangUp();

            // for 'peerCount' message
        } else if (msg.type === 'peerCount') {
					//alert('A peer connected.  Total peers: ' + msg.data);
					var occupantNumber = msg.data|| 0;
					document.getElementById('numberOfOccupants').innerHTML = "Occupants: " + occupantNumber;
        }

    }

    /* function (alternate) that handles incoming signaling messages */
    function processSignalingMessage00(message) {
        var msg = JSON.parse(message);

        // if (msg.type === 'offer')  --> will never happened since isRTCPeerConnection=true initially

        // for 'answer' messages
        if (msg.type === 'answer' && sessionStarted) {
            peerConn.setRemoteDescription(peerConn.SDP_ANSWER, new SessionDescription(msg.sdp));

            // for 'candidate' messages
        } else if (msg.type === 'candidate' && sessionStarted) {
            var candidate = new IceCandidate(msg.label, msg.candidate);
            peerConn.processIceMessage(candidate);

            // for 'by' messages (or remote hangups)
        } else if (msg.type === 'bye' && sessionStarted) {
            onRemoteHangUp();

        }

    }

    /* function to start local video capture */
    function startVideo() {
        // Replace the source of the video element with the stream from the camera
        try {
            navigator.webkitGetUserMedia({'audio':true, 'video':true }, successCallback, errorCallback);
        } catch (e) {
            navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
        }

        function successCallback(stream) {
            scope.SETTINGS.sourceVideo.src = window.webkitURL.createObjectURL(stream);

            localStream = stream;
            waitForLocalVideo();
        }

        function errorCallback(error) {
            console.log('An error occurred: [CODE ' + error.code + ']');
        }

    }

    /* function to stop local video capture */
    function stopVideo() {
        scope.SETTINGS.sourceVideo.src = "";
        //onHangUp();
    }

    /* function to connect to peer */
    function connect() {
        if (!sessionStarted && localStream) {
            turnOnConnectedIndicator();
            //console.log("Creating PeerConnection.");
            createPeerConnection();
            //console.log('Adding local stream...');
            peerConn.addStream(localStream);
            sessionStarted = true;
            //console.log("isRTCPeerConnection: " + isRTCPeerConnection);

            //create offer
            if (isRTCPeerConnection) {
                peerConn.createOffer(setLocalAndSendMessage, null, scope.SETTINGS.mediaConstraints);
            } else {
                var offer = peerConn.createOffer(scope.SETTINGS.mediaConstraints);
                peerConn.setLocalDescription(peerConn.SDP_OFFER, offer);
                sendMessage({
                    type: 'offer',
                    sdp: offer.toSdp()
                });
                peerConn.startIce();
            }

        } else {
            alert("You must 'initialize your' video before connecting...");
        }
    }

    /* function to handle local hang up event */
    function onHangUp() {
        //console.log("Hang up.");
        turnOffConnectedIndicator();
        if (sessionStarted) {
            sendMessage({
                type: 'bye'
            });
            closeSession();
        }
    }

    /* function to handle remote hang up event */
    function onRemoteHangUp() {
        //console.log("Remote Hang up.");
        turnOffConnectedIndicator();
        closeSession();
    }

    /* function to close peer connection session */
    function closeSession() {
        peerConn.close();
        peerConn = null;
        sessionStarted = false;
        scope.SETTINGS.remoteVideo.src = "";
    }

    /* function to set local SessionDescription(for caller) and send 'Offer' SDP */
    function setLocalAndSendMessage(sessionDescription) {
	    // Set Opus as the preferred codec in SDP if Opus is present.
	    	sessionDescription.sdp = preferOpus(sessionDescription.sdp);

        peerConn.setLocalDescription(sessionDescription);
        sendMessage(sessionDescription);
    }



/*** code below adapted from the recent demo that Firefox & Chrome released to handle audio code requirements.  See http://webrtc.org ****/

	  /* function to set Opus as the default audio codec if it's present (as it is most likely goign to become a mandatory webRTC codec) */
	  function preferOpus(sdp) {
	    var sdpLines = sdp.split('\r\n');

	    // Search for m line.
	    for (var i = 0; i < sdpLines.length; i++) {
	        if (sdpLines[i].search('m=audio') !== -1) {
	          var mLineIndex = i;
	          break;
	        }
	    }
	    if (mLineIndex === null)
	      return sdp;

	    // If Opus is available, set it as the default in m line.
	    for (var i = 0; i < sdpLines.length; i++) {
	      if (sdpLines[i].search('opus/48000') !== -1) {
	        var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
	        if (opusPayload)
	          sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
	        break;
	      }
	    }

	    // Remove CN in m line and sdp.
	    sdpLines = removeCN(sdpLines, mLineIndex);

	    sdp = sdpLines.join('\r\n');
	    return sdp;
	  }

  function extractSdp(sdpLine, pattern) {
    var result = sdpLine.match(pattern);
    return (result && result.length == 2)? result[1]: null;
  }

  // Set the selected codec to the first in m line.
  function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');
    var newLine = new Array();
    var index = 0;
    for (var i = 0; i < elements.length; i++) {
      if (index === 3) // Format of media starts from the fourth.
        newLine[index++] = payload; // Put target payload to the first.
      if (elements[i] !== payload)
        newLine[index++] = elements[i];
    }
    return newLine.join(' ');
  }

  // Strip CN from sdp before CN constraints is ready.
  function removeCN(sdpLines, mLineIndex) {
    var mLineElements = sdpLines[mLineIndex].split(' ');
    // Scan from end for the convenience of removing an item.
    for (var i = sdpLines.length-1; i >= 0; i--) {
      var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
      if (payload) {
        var cnPos = mLineElements.indexOf(payload);
        if (cnPos !== -1) {
          // Remove CN payload from m line.
          mLineElements.splice(cnPos, 1);
        }
        // Remove CN line in sdp
        sdpLines.splice(i, 1);
      }
    }

    sdpLines[mLineIndex] = mLineElements.join(' ');
    return sdpLines;
  }

/*** end of code audio code code adapted from Firefox & Chrome's recent webRTC implementation ****/



    /* function to set local SessionDescription(for callee) and send 'Answer' SDP */
    function setLocalAndSendMessage00(answer) {
        peerConn.setLocalDescription(peerConn.SDP_ANSWER, answer);
        sendMessage({
            type: 'answer',
            sdp: answer.toSdp()
        });
        peerConn.startIce();
    }

    /* function to add event listeners for control buttons */
    function addControlButtonEventListeners() {
        scope.SETTINGS.btnStartVideo.addEventListener('click', startVideo, false);
        scope.SETTINGS.btnStopVideo.addEventListener('click', stopVideo, false);
        scope.SETTINGS.btnConnect.addEventListener('click', connect, false);
        scope.SETTINGS.btnDisconnect.addEventListener('click', onHangUp, false);
    }

    /* function to remove event listeners for control buttons */
    function removeControlButtonEventListeners() {
        scope.SETTINGS.btnStartVideo.removeEventListener('click', startVideo, false);
        scope.SETTINGS.btnStopVideo.removeEventListener('click', stopVideo, false);
        scope.SETTINGS.btnConnect.removeEventListener('click', connect, false);
        scope.SETTINGS.btnDisconnect.removeEventListener('click', onHangUp, false);
    }

    /* function to turn on connected indicator */
    function turnOnConnectedIndicator() {
        scope.SETTINGS.connectionIndicator.style.visibility = 'visible';
        //scope.SETTINGS.remoteVideo.style.webkitTransform = "rotate3d(0, 1, 0, 0deg) translate3d(0px, 0px, 0px)";
    }

    /* function to turn off connected indicator */
    function turnOffConnectedIndicator() {
        scope.SETTINGS.connectionIndicator.style.visibility = 'hidden';
        //scope.SETTINGS.remoteVideo.style.webkitTransform = "rotate3d(0, 1, 0, 180deg) translate3d(900px, -100px, 3000px)";
    }

    /* function to merge passed in settings with defaults */
    function mergeOptions(defaults, options) {
        for (var name in defaults) {
            if (defaults.hasOwnProperty(name)) {
                // if property doesn't exist in options add it using the value in defaults
                if (options[name] == null) {
                    options[name] = defaults[name];
                }
            }
        }
        return options;
    }

    /* function to add all needed event listeners */
    function addAllEventListeners() {
        addControlButtonEventListeners(); // add button controls
        socket.addEventListener("message", onMessage, false); // for accepting messages from websocket server (signaling)

        // for terminating server connection upon closing window if user hasn't done so
        window.onbeforeunload = function () {
            if (sessionStarted) {
                sendMessage({
                    type: 'bye'
                });
            }
        };

    }

    /* function to remove all needed event listeners */
    function removeAllEventListeners() {
        removeControlButtonEventListeners(); // remove button controls
        socket.removeEventListener("message", onMessage, false); // for accepting messages from websocket server (signaling)

        // for terminating server connection upon closing window if user hasn't done so
        window.onbeforeunload = null;
    }

    // --------------------------------------------------------------------------------------------
    // Public/Privileged Methods
    // --------------------------------------------------------------------------------------------

    //..

    // --------------------------------------------------------------------------------------------
    // Initialize
    // --------------------------------------------------------------------------------------------

    addAllEventListeners(); // add event handlers

    startVideo();

};