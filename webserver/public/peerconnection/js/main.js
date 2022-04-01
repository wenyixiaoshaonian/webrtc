'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnConnserver = document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');
var inputShareDesk = document.querySelector('input#shareDesk');

var offer = document.querySelector('textarea#offer');
var answer = document.querySelector('textarea#answer');

var socket;
var localStream = null;
var rooms = 111111;
var pc;
var state = 'init';
function getMediaStream(stream) {
	localVideo.srcObject = stream;
	localStream = stream;
}
function sendMessage(rooms,data) {
    if(socket) {
        socket.emit('message',rooms,data);
    }
}
function handleOfferError() {
	console.error('fild to create offer');
}
function handleAnswerError() {
	console.error('fild to create answer');
}

function getOffer(desc) {
    //将收集好的本地媒体信息填充到pc中，同时向stun服务器发送收集候选者的请求
	pc.setLocalDescription(desc);
    //将SDP通过信令服务器发送给对端
	sendMessage(rooms,desc);
}
function getAnswer(desc) {
    //将收集好的本地媒体信息填充到pc中，同时向stun服务器发送收集候选者的请求
	pc.setLocalDescription(desc);
    //将SDP通过信令服务器发送给对端
	sendMessage(rooms,desc);
}

function call() {
    if(state === 'joined_conn') {
        if(pc) {
            var offerOptions = {
                offerToRecieveAudio: 0,
                offerToReceiveVideo: 1
            }
            //创建一个offer的SDP,并按照我们的配置收集媒体信息
            pc.createOffer(offerOptions)
                            .then(getOffer)
                            .catch(handleOfferError);
        }
    }
}
function handleError(err) {
	console.error('Failed to get Media Stream!',err);
}

function start() {
	if (!navigator.mediaDevices ||
		!navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia is not support');
	}
	else {
		var constraints = {
			video: true,
			audio: false
		}
		navigator.mediaDevices.getUserMedia(constraints)
							.then(getMediaStream)
							.catch(handleError)
	}
}

function conn() {
    socket = io.connect();

    socket.on('joined',(room,id) => {
        state = 'joined';

        createPeerConnection();

        btnConnserver.disabled = true;
        btnLeave.disabled = false;
        console.log('>>>>=== joined');
        
    });

    socket.on('otherjoin',(room,id) => {
        console.log('>>>>=== otherjoin');

        if(state === 'joined_unbind') {
            createPeerConnection();
        }
        state = 'joined_conn';

        //开始媒体协商
        call();
    });
    socket.on('full',(room,id) => {
        console.log('>>>>=== full');
        state = 'leaved';
        socket.disconnect();
        alert('the room is full');
    });
    socket.on('leaved',(room,id) => {
        console.log('>>>>=== leaved');
        state = 'leaved';
        socket.disconnect();        
        btnConnserver.disabled = false;
        btnLeave.disabled = true;
    });
    socket.on('bye',(room,id) => {
        console.log('>>>>=== bye');
        state = 'joined_unbind';
        closePeerConnection();
    });
    socket.on('message',(room,id,data) => {
        console.log('>>>>=== message');
        //媒体协商
        if(data) {
            if(data.type === 'offer') {
                pc.setRemoteDescription(new RTCSessionDescription(data));
                pc.createAnswer()
                        .then(getAnswer)
                        .catch(handleAnswerError);
            }
            else if (data.type === 'answer') {
                pc.setRemoteDescription(new RTCSessionDescription(data));
            }
            else if (data.type === 'candidate') {
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: data.label,
                    candidate: data.candidate
                });
                pc.addIceCandidate(candidate);	
            }
            else {
                console.log('the message is invalid!',data.type);
            }
        }
    });

    socket.emit('join',rooms);

    return true;
}

function connserver() {
    start();

    conn();
    return true;
}

function createPeerConnection() {
    if(!pc) {
        var pcConfig = {
            'iceServers': [
                {
                    'urls': 'turn:192.168.87.129:3478',
                    'credential': 'caoboxi',
                    'username': 'mypasswd'
                }
            ]
        };
        pc = new RTCPeerConnection();

        pc.onicecandidate = (e) => {
                if(e.candidate) {
                    //将candidate以message的方式通过信令服务器发送给对端
                    sendMessage(rooms, {
			    		type: 'candidate',
			    		label:e.candidate.sdpMLineIndex, 
			    		id:e.candidate.sdpMid, 
			    		candidate: e.candidate.candidate
			    	});
			    }else{
			    	console.log('this is the end candidate');
			    }
            }

        pc.ontrack = (e) => {
            console.log('this is ontrack');
            remoteVideo.srcObject = e.streams[0];
        }
    }

    if(localStream) {
        localStream.getTracks().forEach((track) => {
            pc.addTrack(track,localStream);
        });
    }
    
}

function closePeerConnection() {
    console.log('close PeerConnection');
    if(pc) {
        pc.close();
        pc = null;
    }
}
function closeLocalMedia() {
    if(localStream && localStream.getTracks()) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    localStream = null;
}

function leave() {
    if(socket)
        socket.emit('leave','111111');

    closePeerConnection();
    closeLocalMedia();

    btnConnserver.disabled = false;
    btnLeave.disabled = true;
}
btnConnserver.onclick = connserver;
btnLeave.onclick = leave;



