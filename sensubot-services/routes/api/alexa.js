var router = require('express').Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var request = require('request');
var chatService = require('../../services/chatservice.js');

module.exports = function(users, _db){

    router.get('/', function(req, res){
        res.send({
            message: 'hello from sensubot'
        });
    });

    router.post('/', jsonParser, function(req, res) {
        
        console.log(req.body);

        // res.send('Hello from sensubot!');
        // res.sendStatus(200);
        receivedMessage(req.body, users, _db, res);
    });

    router.post('/exit', jsonParser, function(req, res) {
        console.log('Removing user: ' + getShortenedUser(req.body.id));
        users.deleteUser(getShortenedUser(req.body.id));
        res.send('exiting sensubot');
    });

    return router;
}

function receivedMessage(body, users, _db, res) {
    if (users.getUser(getShortenedUser(body.id)) == undefined){
        console.log('new user');
        users.addUser(getShortenedUser(body.id));
        var question = users.getUser(getShortenedUser(body.id)).currentQuestion.content;

        res.send({
            speech: question,
            link: '',
            cardOutput: question
        });
    }
    else {
        var user = users.getUser(getShortenedUser(body.id));
        var question = null;

        var regexp = /[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/;

        if (body.body.match(regexp)) {
            body.body = reformatDate(body.body);
        }

        chatService.run(_db, user, body.body).then(q => {
            if (q.returnMessage){
                question = q.returnMessage;
            }
            else {
                question = q.currentQuestion.content;
            }

            users.updateUser(user);
            
            var response = {};
            var speech = '';
            var cardOutput = '';
            var link = '';

            for(var i = 0; i < question.length; i++) {
                console.log(question[i]);
                if (question[i] === 'Please enter the email address that you would like to be contacted through. (Enter in this format: name@aol.com)') {
                    speech = '<p>I will send the form to a card on your alexa app.</p><p>Please confirm by responding Yes</p>';
                }
                else if (question[i].substring(0,4) == 'http') {
                    link = question[i];
                    console.log('url:', question[i]);
                    speech += '<p>I have attached a form link that can be viewed in the app cards.</p>'
                    cardOutput += question[i];
                }
                else if (question[i] === 'I have emailed you the relevant information, thank you for using Sensubot.') {
                    users.deleteUser(getShortenedUser(body.id));
                }
                else {
                    speech += '<p>' + question[i] + '</p>';
                    cardOutput += question[i];
                }
                
            }
            res.send({
                speech: speech,
                link: link,
                cardOutput: cardOutput
            });
        });
    }    
}

function getShortenedUser(id) {
    return id.substring(17, 37);
}

function reformatDate(date) {
    var year = date.substring(0,4);
    var month = date.substring(5,7);
    var day = date.substring(8,10);

    return month+'/'+day+'/'+year;
}