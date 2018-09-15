var router = require('express').Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var request = require('request');
var chatService = require('../../services/chatservice.js');
//var dbService = require('../services/dbservice.js');

const token = 'VERIFY_TOKEN';

module.exports = function(users, _db){

    router.get('/', function(req, res){
        if (req.query['hub.mode'] === 'subscribe' &&
            req.query['hub.verify_token'] === process.env.VALIDATION_TOKEN) {
                console.log('Validating webhook');
                res.status(200).send(req.query['hub.challenge']);
            }
        else {
            console.error('Failed token validation');
            res.sendStatus(403);
        }
    });

    router.post('/', jsonParser, function(req, res) {
        var data = req.body;

        //Make sure this is a page subscription
        if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
          var pageID = entry.id;
          var timeOfEvent = entry.time;

          // Iterate over each messaging event
          entry.messaging.forEach(function(event) {
            if (event.message) {
              receivedMessage(event, users, _db);
            } else {
              //console.log("Webhook received unknown event: ", event);
            }
          });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
      }
    });

    return router;
}



function receivedMessage(event, users, _db) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.

    /***NEW STUFF ***/
    //if user doesn't exist in local storage, send new message'

    //console.log("\n\n\n");
    if (users.getUser(senderID) == undefined){
      console.log('new user');
      users.addUser(senderID);
      var question = users.getUser(senderID).currentQuestion.content;
      sendTextMessage(senderID, question);
    }
    else {
      var user = users.getUser(senderID);
      var question = null;

      // User wants to restart the conversation.
      if (messageText === 'restart') {

        // Delete old user info from cache.
        users.removeUserData(senderID);

        // Create new user info and respond
        users.addUser(senderID);
        var question = users.getUser(senderID).currentQuestion.content;
        sendTextMessage(senderID, question);

      } else if ( user ) {

        // Run the chatservice if the user exists.
        chatService.run(_db, user, message.text).then(q => {
          if (q.returnMessage){
            question = q.returnMessage;
          }
          else {
            question = q.currentQuestion.content;
          }

          users.updateUser(user);

          for(var i = 0; i < question.length; i++) {
            sendTextMessage(senderID, question[i]);
          }

          // Remove user from cache once they've completed the conversation.
          if ( user.finished ) {
            users.removeUserData(senderID);
            console.log('user ' + senderID + ' deleted');
          }
        });
      }
    }

    //sendTextMessage(senderID, messageText);

  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function sendGenericMessage(recipientId, messageText) {
  // To be expanded in later sections
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}
