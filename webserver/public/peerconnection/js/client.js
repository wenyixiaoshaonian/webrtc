'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnStart = document.querySelector('button#start');
var btnCall = document.querySelector('button#call');
var btnHangup = document.querySelector('button#hangup');

var localStream;
var pc1;
var pc2;
function getMediaStream(stream) {
	localVideo.srcObject = stream;
	localStream = stream;
}

function handleError(err) {
	console.error('Failed to get Media Stream!',err);
}

function start() {
	if (!navigator.mediaDevices ||
		!navigator.mediaDevices.getUserMedia) {
		concole.error('getUserMedia is not support');
	}
	else {
		var constraints = {
			video: true,
			audio: true
		}
		navigator.mediaDevices.getUserMedia(constraints)
							.then(getMediaStream)
							.catch(handleError)
	}
}

function getRemoteStream(e) {
	remoteVideo.srcObject = e.streams[0];
}

function handleOfferError() {
	concole.error('fild to create offer');
}

function handleAnswerError() {
	concole.error('fild to create answer');
}

function getAnswer(desc) {
	pc2.setLocalDescription(desc);

	//send desc to signal
	//receive desc from signal

	pc1.setRemoteDescription(desc);	
}
function getOffer(desc) {
	pc1.setLocalDescription(desc);

	//send desc to signal
	//receive desc from signal

	pc2.setRemoteDescription(desc);
	pc2.createAnswer()
			.then(getAnswer)
			.catch(handleAnswerError);
}
function call() {
	pc1 = new RTCPeerConnection();
	pc2 = new RTCPeerConnection();

	pc1.onicecandidate = (e) => {
		//send e to signal

		//receive e from signal
		pc2.addIceCandidate(e.candidate);
	}

	pc2.onicecandidate = (e) => {
		//send e to signal

		//receive e from signal
		pc1.addIceCandidate(e.candidate);
	}

	pc2.ontrack = getRemoteStream;

	localStream.getTracks().forEach((track) => {
		pc1.addTrack(track,localStream);
	});

	var offerOptions = {
		offerToRecieveAudio: 0,
		offerToReceiveVideo: 1
	}
	pc1.createOffer(offerOptions)
					.then(getOffer)
					.catch(handleOfferError);
}

function hangup() {
	pc1.close();
	pc2.close();
	pc1 = null;
	pc2 = null;
}
btnStart.onclick = start;
btnCall.onclick = call;
btnHangup.onclick = hangup;

 