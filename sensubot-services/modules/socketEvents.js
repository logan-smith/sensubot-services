var _ = require('lodash');
var chatService = require('../services/chatservice.js');
var dbService = require('../services/dbservice.js');

exports = module.exports = function(io, users, _db){
    io.on('connection', (socket) => {

        console.log("connection made.");

        // Add user to persistant storage.
        users.addUser(socket.id);
        // Send the intial message.
        io.to(socket.id).emit('response-message', users.getUser(socket.id).currentQuestion.content);

        socket.on('disconnect', function() {
            console.log('user ' + socket.id + ' disconnected');

            users.removeUserData(socket.id);
        });

        // When a message is received from the user.
        socket.on('message', (message) => {
            var user = _.cloneDeep(users.getUser(message.id));

            if (message.text === 'restart') {

              // Delete old user info from cache.
              users.removeUserData(socket.id);

              // Create new user info and respond
              users.addUser(socket.id);
              io.to(socket.id).emit('response-message', users.getUser(socket.id).currentQuestion.content);
            } else if ( user ) {

              // Don't engage the chatService if the user has finished the conversation or is not in cache.
              chatService.run(_db, user, message.text).then(q => {

                var question;
                if (q.returnMessage){
                  question = q.returnMessage;
                }
                else {
                  question = q.currentQuestion.content;
                }

                users.updateUser(user);

                for(var i = 0; i < question.length; i++) {
                  io.to(socket.id).emit('response-message', question[i]);
                }
                
                // Remove user from cache once they've completed the conversation.
                if ( user.finished ) {
                  users.deleteUser(socket.id);
                  console.log('user ' + socket.id + ' deleted');
                }
              });
            }
        });
    });
}
