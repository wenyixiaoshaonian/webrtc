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

var divConstraints = document.querySelector('div#constraints');

//record
var recvideo = document.querySelector('video#recplayer');
var btnRecord = document.querySelector('button#record');
var btnPlay = document.querySelector('button#recplay');
var btnDownload = document.querySelector('button#download');
var buffer;
var mediaRecorder;

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

	var videoTrack = stream.getVideoTracks()[0];
	var videoConstraints = videoTrack.getSettings();

	divConstraints.textContent = JSON.stringify(videoConstraints, null, 2);

	window.stream = stream;
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
		// audio : {
		// 	echoCancellation : true,
		// 	autoGainControl : true,
		// 	noiseSuppression : true,
		// },
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
	picture.getContent('2d').drawImage(videoplay,
										0,0,
										picture.width,
										picture.height);
}
function handleDataAvailable(e) {
	if (e && e.data && e.data.size > 0){
		buffer.push(e.data);
	}
}
function startRecord() {
	buffer = [];

	var options = {
		mimType: 'video/webm;codecs=vp8'
	}
	//判断浏览器是否支持该options
	if(!MediaRecorder.isTypeSupported(options.mimType)) {
		concole.error('${options.mimType} is not supported!');
		return;
	}
	try {
		mediaRecorder = new MediaRecorder(window.stream,options);
	}
	catch(e) {
		concole.error('Failed to create MediaRecorder!');
		return;
	}
	//每次数据有效时就会调用这个函数
	mediaRecorder.ondataavailable = handleDataAvailable;
	mediaRecorder.start(10);

}

function stoptRecord() {
	mediaRecorder.stop();
}
btnRecord.onclick = ()=> {
	if(btnRecord.textContent === 'Start Record') {
		startRecord();
		btnRecord.textContent = 'Stop Record';
		btnPlay.disabled = true;
		btnDownload.disabled = true;
	}
	else {
		stoptRecord();
		btnRecord.textContent = 'Start Record';
		btnPlay.disabled = false;
		btnDownload.disabled = false;	
	}
}

btnPlay.onclick = ()=> {
	var blob = new Blob(buffer,{type: 'video/webm'});
	recvideo.src = window.URL.createObjectURL(blob);
	recvideo.srcObject = null;
	recvideo.controls = true;
	recvideo.play();
}

btnDownload.onclick = ()=>{
	var blob = new Blob(buffer,{type: 'video/webm'});
	var url = window.URL.createObjectURL(blob);
	var a = document.createElement('a');

	a.href = url;
	a.style.display = 'none';
	a.download = 'aaa.webm';
	a.click();
}