'use strict'

//devices
var audioSource = document.querySelector('select#audioSource');
var audioOutput = document.querySelector('select#audioOutput');
var videoSource = document.querySelector('select#videoSource');

//filters
var filterSelect = document.querySelector('select#filter');

//picture
var snapshot = document.querySelector('button#snapshot');
var picture = document.querySelector('canvas#picture');
picture.width = 640;
picture.height = 480;

var videoplay = document.querySelector('video#player');
//var audioplay = document.querySelector('audio#audioplayer');


function gotDevices(deviceInfos){

	deviceInfos.forEach(function(deviceinfo){

		var option = document.createElement('option');
		option.text = deviceinfo.label;
		option.value = deviceinfo.deviceId;
	
		if(deviceinfo.kind === 'audioinput'){
			audioSource.appendChild(option);
		}else if(deviceinfo.kind === 'audiooutput'){
			audioOutput.appendChild(option);
		}else if(deviceinfo.kind === 'videoinput'){
			videoSource.appendChild(option);
		}
	})
}

function gotMediaStream(stream){

	videoplay.srcObject = stream;
	//audioplay.srcObject = stream;

	return navigator.mediaDevices.enumerateDevices();
}

function handleError(err){
	console.log('getUserMedia error:', err);
}

function start() {

	if(!navigator.mediaDevices ||
		!navigator.mediaDevices.getUserMedia){

		console.log('getUserMedia is not supported!');
		return;

	}else{

		var deviceId = videoSource.value; 
		var constraints = {
			video : {
				width: 640,	
				height: 480,
				frameRate:15,
				facingMode: 'enviroment',
				deviceId : deviceId ? {exact:deviceId} : undefined 
			}, 
			// audio : true 
		}

		navigator.mediaDevices.getUserMedia(constraints)
			.then(gotMediaStream)
			.then(gotDevices)
			.catch(handleError);
	}
}

start();

videoSource.onchange = start;

filterSelect.onchange = function() {
	videoplay.className = filterSelect.value;
}

snapshot.onclick = function() {
	picture.className = filterSelect.value;
	picture.getContext('2d').drawImage(videoplay,
										0,0,
										picture.width,
										picture.height);
}