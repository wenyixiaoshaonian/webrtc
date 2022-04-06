'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnConnserver = document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');

var offer = document.querySelector('textarea#offer');
var answer = document.querySelector('textarea#answer');

var bandwidth = document.querySelector('select#bandwidth');

var chat = document.querySelector('textarea#chat');
var send_text = document.querySelector('textarea#sendtext');
var btnSend = document.querySelector('button#send');

var socket;
var localStream = null;
var rooms = 111111;
var pc = null;
var dc = null;
var state = 'init';

var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;

function getMediaStream(stream) {
    console.log("getMediaStream....");
	localVideo.srcObject = stream;
	localStream = stream;

    //一定要放到getMediaStream之后再调用
	//否则就会出现绑定失败的情况,因为js都为异步调用，不会等待getMediaStream完成
    conn();

    bitrateSeries = new TimelineDataSeries();
    bitrateGraph = new TimelineGraphView('bitrateGraph','bitrateCanvas');
    bitrateGraph.updateEndDate();

    packetSeries = new TimelineDataSeries();
	packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
	packetGraph.updateEndDate();
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
    console.log("send offer....");
	sendMessage(rooms,desc);
}
function getAnswer(desc) {
    //将收集好的本地媒体信息填充到pc中，同时向stun服务器发送收集候选者的请求
	pc.setLocalDescription(desc);
    //将SDP通过信令服务器发送给对端
    console.log("send answer....");
	sendMessage(rooms,desc);
    bandwidth.disabled = false;
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
function receivemsg(e) {
    var msg = e.data;
    if(msg) {
        chat.value += '->' + msg + '\r\n';
    }
    else {
        console.error('received message error!');
    }
}
function dataChannelStateChange() {
    var readyState = dc.readyState;
    if(readyState === 'open') {
        send_text.disabled = false;
        send.disabled = false;
    }
    else {
        send_text.disabled = true;
        send.disabled = true;
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
        dc = pc.createDataChannel('chat');
        dc.onmessage = receivemsg;
        dc.onopen = dataChannelStateChange;
        dc.onclose = dataChannelStateChange;

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
                console.log("recv offer.... id : ",id);
                pc.setRemoteDescription(new RTCSessionDescription(data));
                pc.createAnswer()
                        .then(getAnswer)
                        .catch(handleAnswerError);
            }
            else if (data.type === 'answer') {
                console.log("recv answer.... id : ",id);
                pc.setRemoteDescription(new RTCSessionDescription(data));
                bandwidth.disabled = false;
            }
            else if (data.type === 'candidate') {
                console.log("recv candidate.... id : ",id);
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

//    conn();
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
                    console.log("send candidate....");
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

        pc.ondatachannel = (e)=> {
            if(!dc){
                dc = e.channel;
                dc.onmessage = receivemsg;
                dc.onopen = dataChannelStateChange;
                dc.onclose = dataChannelStateChange;
            }
        }
    }

    if(localStream) {
        console.log('this is addTrack....');
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
    bandwidth.disabled = true;
}
function change_bw(){
	bandwidth.disabled = true;
	var bw = bandwidth.options[bandwidth.selectedIndex].value;

	var vsender = null;
	var senders = pc.getSenders();

	senders.forEach(sender => {
		if(sender && sender.track.kind === 'video'){
			vsender = sender;
		}
	});

	var parameters = vsender.getParameters();

	if(!parameters.encodings){
		parameters.encodings=[{}];
	}

	if(bw === 'unlimited'){
		delete parameters.encodings[0].maxBitrate;
	}else{
		parameters.encodings[0].maxBitrate = bw * 1000;
	}

	vsender.setParameters(parameters)
		.then(()=>{
			bandwidth.disabled = false;
		})
		.catch(err => {
			console.error(err)
		});

	return;
}
window.setInterval(() => {
    if(!pc)
        return;
    const sender = pc.getSenders()[0];
    if(!sender) {
        return;
    }
    sender.getStats()
            .then((reports) => {
                reports.forEach(report => {
                    let bytes;
                    let packets;
                    if(report.type === 'outbound-rtp') {
                        if(report.isRemote) {
                            return;
                        }
                        const now = report.timestamp;
                        bytes = report.bytesSent;
                        packets = report.packetsSent;
                        if(lastResult && lastResult.has(report.id)) {
                            // calculate bitrate
                            const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent)
                                                / (now - lastResult.get(report.id).timestamp);

                            bitrateSeries.addPoint(now, bitrate);
                            bitrateGraph.setDataSeries([bitrateSeries]);
                            bitrateGraph.updateEndDate();

                            // calculate number of packets and append to chart
                            packetSeries.addPoint(now, packets - lastResult.get(report.id).packetsSent);
                            packetGraph.setDataSeries([packetSeries]);
                            packetGraph.updateEndDate();
                        }
                    }
                });
                lastResult = reports;
            });
},1000);

function sendText() {
    var data = send_text.value;
    if(data) {
        dc.send(data);
    }
    send_text.value = '';
    chat.value += '<-' + data + '\r\n';
}
btnConnserver.onclick = connserver;
btnLeave.onclick = leave;
bandwidth.onchange = change_bw;

btnSend.onclick = sendText;
