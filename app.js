
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

var io = require('socket.io').listen(http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
}));


var users = [];
var rooms = [];
function change_room ( socket, room ) {
  socket.leave(socket.room);
  socket.join(room);
  socket.room = room;
}

// User connected
io.sockets.on('connection', function (socket) {


  var info = function(message){
    socket.emit('info', message);
  };
  // Push new user to the users collection
  users.push(socket.id);
  // Emit all the connected users to the new user
  io.sockets.emit('users', { users: users });
  // Emit all the available rooms to the new user
  io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
  // Assign user to default room lobby
  socket.room = 'lobby';
  // Tell the player its socket id also currently in what room
  info("Player ID: " + socket.id + "\n" + "In Room: " + socket.room);

  socket.on('create_room', function ( data ) {
    if(io.sockets.manager.rooms['/' + data.room] === undefined){
      change_room(socket,data.room);
      info(socket.id + " created [" +socket.room + "] room");
      io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
    }else{
      socket.emit('info', 'Room with that name already exists');
    }
  });

  socket.on('random_room', function () {
    var list_rooms = io.sockets.manager.rooms;
    if (socket.room == 'lobby') {
      var got_it = false;
      for(var available in list_rooms ){
        if(available !== ""){
          if(io.sockets.clients(available.slice(1)).length != 3){
            change_room(socket, available.slice(1));
            io.sockets.in(socket.room).emit('info', socket.id + " joined [" + socket.room + "] room");
            io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
            got_it = true;
            break;
          }
        }
      }
      if(!got_it){
        info('--- There are no available rooms for now ---');
      }
    }
    else
    {
      info('you already in a room');
    }
  });

  socket.on('join_room', function (data) {
    change_room(socket, data.room);
    info(socket.id + " join [" + socket.room + "] room");
    io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
  });

  socket.on('leave_room', function () {
    io.sockets.in(socket.room).emit('info', socket.id + " left [" + socket.room + "] room");
    socket.leave(socket.room);
    io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
    socket.room = 'lobby';
  });
  socket.on('disconnect', function () {
    users.splice(users.indexOf(socket.id),1);
    socket.leave(socket.room);
    io.sockets.emit('users', { users: users });
    io.sockets.emit('rooms', { rooms: io.sockets.manager.rooms });
  });


});