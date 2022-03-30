'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnConnserver = document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');
var btnShareDesk = document.querySelector('button#shareDesk');

var offer = document.querySelector('textarea#offer');
var answer = document.querySelector('textarea#answer');





btnConnserver.onclick = connserver;
btnLeave.onclick = leave;
btnShareDesk.onclick = shareDesk;



