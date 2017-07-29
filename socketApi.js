'use strict';
// Load socket.io module & create new instance
const io = require('socket.io')();

const socketApi = {};
const debugPrefix = 'SocketAPI: ';
const elementNotFound = -1;
const Chat = require('./models/Chat');
const xssFilters = require('xss-filters');

socketApi.io = io;

// Stores users that are connected @ default namespace @ default room
let users = [];

// event handler for each connected socket
io.on('connection', (socket) => {
  console.log(debugPrefix + 'A user connected');

  socket.on('new user', function (userData, eventData, callback) {
    {
      socket.userName = userData.name;
      users.push(socket.userName);
      socket.room = eventData.roomId;
      socket.join(socket.room);

      console.log(socket.userName + ' has joined room ' + socket.room);
      io.in(socket.room).emit('updateChatUsers', users);
    }

    console.log('New User Event - Global socket users: ' + users);
      // Show previous messages of chat history
      Chat.find({'roomId':socket.room}).sort({date: -1}).limit(5).exec(function(err, historyChatMsg){
      console.log('History:' + historyChatMsg);
      io.in(socket.room).emit('sendChatHistory', historyChatMsg);
  });

  });

  socket.on('chat message', (data) => {

    console.log(socket.userName + ' has sent a message ' + data.message
      + ' to room ' + socket.room);

    // Overwrite the message with special characters escaped
    data.message =  xssFilters.inHTMLData(data.message);

    const chat = new Chat({
        name:data.name,
        message: data.message,
        date: data.date,
        image: data.image,
        roomId: socket.room,
    });

    console.log('Chat DB: ' + chat);

    chat.save((err, chat) => {
        if (err){
            console.log('unable to save chat message');
            throw err;
        }
    });

    // Emit chat message to every client in room
    io.in(socket.room).emit('chat message', data);
  });

  socket.on('disconnect', () => {
    users.splice(users.indexOf(socket.userName), 1);
    io.in(socket.room).emit('updateChatUsers', users);
    console.log(socket.userName + ' has left room ' + socket.room);
    socket.leave(socket.room);
    console.log(debugPrefix + 'A user disconnected');
    console.log('Disconnect Event - Global socket users: ' + users);
  });
});


module.exports = socketApi;
