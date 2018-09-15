var fs = require('fs');
var path = require('path');

module.exports = function(storage){

    var initialValues = require('../initialValues.json');
    var users = {};

    return {
        sayHello: function(){
            console.log('hello');
        },

        addUser: function(socketId){

            var user = {
                'id': socketId,
                'data': {},
                'qualifications': initialValues.initialQualifications,
                'qualQuestions': initialValues.initialQuestions,
                'dataQuestions': [],
                'currentQuestion': {content: 'Welcome to the sensubot chat page. Lets get started with some basic information about you. \n Which state do you live in?',
                                    saveto: 'state'
                                    },
                'forms': [],
                'currentForm': 'initial',
                'currentMessage': '',
                'completedForms': []
            };
            storage.setItemSync(socketId, user);
        },
        getUser: function(id){
            return storage.getItemSync(id);
        },
        updateUser: function(user){
            storage.setItemSync(user.id, user);
        },
        deleteUser: function(id){
            storage.removeItemSync(id);
        },
        removeUserData: function(id) {
          storage.removeItemSync(id);

          // Delete the financial hardship letter if it exists.
          var p = path.join(path.resolve(), 'assets', 'financial-hardship-letter-'+id+'.docx');

          fs.stat(p, function (err, stats) {
             if (err) {
                 // File doesn't exist.
             } else {
               fs.unlink(p, function(err){
                 if(err) return console.log(err);
                 console.log('file deleted successfully');
               });
             }
          });
        }
    }
}
