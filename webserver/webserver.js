"use strict"

var http = require('http');
var https = require('https');
var fs = require('fs');

var express = require('express');
var serveIndex = require('serve-index');

var socketIO = require('socket.io');

var app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));

// var http_server = http.createServer(app);
// http_server.listen(80,'0.0.0.0');

var options = {
	key : fs.readFileSync('./cert/key.pem'),
	cert : fs.readFileSync('./cert/cert.pem')
}
var https_server = https.createServer(options,app);
var io = socketIO.listen(https_server);

io.sockets.on('connection',(socket)=> {
	socket.on('join',(room) => {
		socket.join(room);
		var myroom = io.sockets.adapter.rooms[room];
		var users = Object.keys(myroom.sockets).length;
		socket.emit('joined',room,socket.id);
//		socket.to(room).emit('joined',room,socket.id);	//房间内除自己以外
//		io.in(room).emit('joined',room,socket.id);		//房间内所有人
//		socket.broadcast.emit('joined',room,socket.id);	//站点所有人 除自己
	});
	socket.on('leave',(room) => {
		var myroom = io.sockets.adapter.rooms[room];
		var users = Object.keys(myroom.sockets).length;

		socket.leave(room);

		socket.emit('joined',room,socket.id);
//		socket.to(room).emit('joined',room,socket.id);	//房间内除自己以外
//		io.in(room).emit('joined',room,socket.id);		//房间内所有人
//		socket.broadcast.emit('joined',room,socket.id);	//站点所有人 除自己
	});	
	socket.on('message', (room, data)=>{
		io.to(room).emit('message', room, socket.id, data)//房间内所有人
	});
})
https_server.listen(4004,'0.0.0.0');
