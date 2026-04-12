export const webrtcPageHtml = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { margin: 0; background: #000; overflow: hidden; width: 100vw; height: 100vh; }
        video { width: 100%; height: 100%; object-fit: cover; }
        #localVideo { position: absolute; top: 20px; right: 20px; width: 120px; height: 160px; z-index: 10; border-radius: 10px; border: 2px solid white; background: #1a1a1a; }
        #remoteVideo { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; background: #000; }
        #remoteAudio { display: none; }
    </style>
</head>
<body>
    <video id="remoteVideo" autoplay playsinline></video>
    <audio id="remoteAudio" autoplay playsinline></audio>
    <video id="localVideo" autoplay playsinline muted></video>
    <script>
        var peerConnection;
        var localStream;
        var pendingIceCandidates = [];
        var hasRemoteDescription = false;

        var localVideo = document.getElementById('localVideo');
        var remoteVideo = document.getElementById('remoteVideo');
        var remoteAudio = document.getElementById('remoteAudio');

        var configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10
        };

        function fetchTurnCredentials() {
            return fetch('https://lookreal.metered.live/api/v1/turn/credentials?apiKey=22bf3000953ecd27e2ae6819fcde6fbd5f47')
                .then(function(response) { return response.json(); })
                .then(function(iceServers) {
                    if (iceServers && iceServers.length > 0) {
                        configuration.iceServers = [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                        ].concat(iceServers);
                        console.log('✅ Got ' + iceServers.length + ' TURN servers');
                    }
                })
                .catch(function(err) {
                    console.error('❌ Failed to fetch TURN credentials:', err.message);
                });
        }

        function sendMessage(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
            }
        }

        function getLocalStream(isVideo) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return Promise.reject(new Error('getUserMedia not available. isSecureContext=' + window.isSecureContext));
            }
            var constraints = {
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: isVideo ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
            };
            return navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
                localStream = stream;
                localVideo.srcObject = localStream;
                sendMessage('localStream', {
                    id: localStream.id,
                    hasAudio: localStream.getAudioTracks().length > 0,
                    hasVideo: localStream.getVideoTracks().length > 0
                });
                return localStream;
            }).catch(function(error) {
                sendMessage('error', { message: 'Error getting local stream: ' + error.message });
                throw error;
            });
        }

        function createPeerConnection() {
            peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = function(event) {
                if (event.candidate) {
                    sendMessage('iceCandidate', event.candidate);
                }
            };

            peerConnection.oniceconnectionstatechange = function() {
                sendMessage('connectionState', { state: peerConnection.iceConnectionState });
                if (peerConnection.iceConnectionState === 'failed') {
                    peerConnection.restartIce();
                }
            };

            peerConnection.onconnectionstatechange = function() {
                sendMessage('connectionState', { state: peerConnection.connectionState });
            };

            peerConnection.ontrack = function(event) {
                if (event.streams && event.streams[0]) {
                    var stream = event.streams[0];
                    remoteVideo.srcObject = stream;
                    remoteAudio.srcObject = stream;
                    function tryPlay(el) {
                        el.play().catch(function() {
                            setTimeout(function() { el.play().catch(function() {}); }, 500);
                        });
                    }
                    tryPlay(remoteVideo);
                    tryPlay(remoteAudio);
                    sendMessage('remoteStream', {
                        id: stream.id,
                        hasAudio: stream.getAudioTracks().length > 0,
                        hasVideo: stream.getVideoTracks().length > 0
                    });
                }
            };

            if (localStream) {
                localStream.getTracks().forEach(function(track) {
                    peerConnection.addTrack(track, localStream);
                });
            }
        }

        window.handleMessage = function(event) {
            var msg = JSON.parse(event.data);
            var type = msg.type;
            var data = msg.data;

            switch (type) {
                case 'init':
                    fetchTurnCredentials().then(function() {
                        return getLocalStream(data.isVideo);
                    }).then(function() {
                        createPeerConnection();
                        sendMessage('initComplete', {});
                    }).catch(function(e) {
                        sendMessage('error', { message: 'Mic/camera failed: ' + e.message });
                        createPeerConnection();
                        sendMessage('initComplete', {});
                    });
                    break;

                case 'createOffer':
                    if (!peerConnection) { sendMessage('error', { message: 'PeerConnection not initialized' }); break; }
                    peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                        .then(function(offer) { return peerConnection.setLocalDescription(offer).then(function() { return offer; }); })
                        .then(function(offer) { sendMessage('offer', offer); })
                        .catch(function(e) { sendMessage('error', { message: 'Offer error: ' + e.message }); });
                    break;

                case 'createAnswer':
                    if (!peerConnection) { sendMessage('error', { message: 'PeerConnection not initialized' }); break; }
                    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
                        .then(function() {
                            hasRemoteDescription = true;
                            var p = Promise.resolve();
                            for (var i = 0; i < pendingIceCandidates.length; i++) {
                                (function(c) { p = p.then(function() { return peerConnection.addIceCandidate(new RTCIceCandidate(c)); }); })(pendingIceCandidates[i]);
                            }
                            pendingIceCandidates = [];
                            return p;
                        })
                        .then(function() { return peerConnection.createAnswer(); })
                        .then(function(answer) { return peerConnection.setLocalDescription(answer).then(function() { return answer; }); })
                        .then(function(answer) { sendMessage('answer', answer); })
                        .catch(function(e) { sendMessage('error', { message: 'Answer error: ' + e.message }); });
                    break;

                case 'handleAnswer':
                    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
                        .then(function() {
                            hasRemoteDescription = true;
                            var p = Promise.resolve();
                            for (var i = 0; i < pendingIceCandidates.length; i++) {
                                (function(c) { p = p.then(function() { return peerConnection.addIceCandidate(new RTCIceCandidate(c)); }); })(pendingIceCandidates[i]);
                            }
                            pendingIceCandidates = [];
                        })
                        .catch(function(e) { sendMessage('error', { message: 'Handle answer error: ' + e.message }); });
                    break;

                case 'addIceCandidate':
                    if (!peerConnection || !hasRemoteDescription) {
                        pendingIceCandidates.push(data.candidate);
                    } else {
                        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(function() {});
                    }
                    break;

                case 'toggleMute':
                    if (localStream) {
                        var at = localStream.getAudioTracks()[0];
                        if (at) { at.enabled = !at.enabled; sendMessage('muteStatus', { muted: !at.enabled }); }
                    }
                    break;

                case 'toggleVideo':
                    if (localStream) {
                        var vt = localStream.getVideoTracks()[0];
                        if (vt) { vt.enabled = !vt.enabled; sendMessage('videoStatus', { enabled: vt.enabled }); }
                    }
                    break;

                case 'switchCamera':
                    if (localStream) {
                        var svt = localStream.getVideoTracks()[0];
                        if (svt) {
                            var cur = svt.getSettings().facingMode || 'user';
                            var nfm = cur === 'user' ? 'environment' : 'user';
                            svt.stop();
                            navigator.mediaDevices.getUserMedia({ video: { facingMode: nfm }, audio: false })
                                .then(function(ns) {
                                    var nvt = ns.getVideoTracks()[0];
                                    var sender = peerConnection.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
                                    var p = sender ? sender.replaceTrack(nvt) : Promise.resolve();
                                    return p.then(function() {
                                        localStream.removeTrack(svt);
                                        localStream.addTrack(nvt);
                                        localVideo.srcObject = localStream;
                                    });
                                })
                                .catch(function(e) { sendMessage('error', { message: 'Switch camera error: ' + e.message }); });
                        }
                    }
                    break;

                case 'endCall':
                    if (localStream) {
                        localStream.getTracks().forEach(function(t) { t.stop(); });
                        localStream = null;
                    }
                    if (peerConnection) { peerConnection.close(); peerConnection = null; }
                    localVideo.srcObject = null;
                    remoteVideo.srcObject = null;
                    remoteAudio.srcObject = null;
                    pendingIceCandidates = [];
                    hasRemoteDescription = false;
                    break;
            }
        };

        document.addEventListener('message', window.handleMessage);
        window.addEventListener('message', window.handleMessage);
    </script>
</body>
</html>`;
