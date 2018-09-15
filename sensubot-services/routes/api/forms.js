var router = require('express').Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var dbService = require('../../services/dbservice.js');
var initialValues = require('../../initialValues.json');

module.exports = function(_db){

    // router.use('/', function(req, res, next) {
    //   console.log('1%s, %s, %s', req.method, req.url, req.path);
    //   // console.log(req);
    //   // console.log(req.headers);
    //   // console.log(req.rawHeaders);
    //   next();
    // });

    router.get('/:id', function(req, res){

        var id = req.params.id.toString();
        dbService.getFormById(_db, id).then(q => {

            if (q) {
                res.send(q);
            }
            else {
                res.sendStatus(400);
            }
        });
    });

    router.get('/user/:userId', function(req, res) {
        /*
          Use this like:
          localhost:3000/forms/user/598e040affe547612f9c2c33
        */
        var id = req.params.userId.toString();

        dbService.getFormsByUserId(_db, id).then(q => {
            if (q) {
                res.send(q);
            }
            else {
                res.sendStatus(400);
            }
        });
    });


    router.options('/formEditor/submitForm', function(req, res) {
      res.header("Access-Control-Allow-Origin", "http://localhost:4200");
      res.header("Access-Control-Allow-Headers", ["access-control-allow-origin", "content-type"]);
      res.sendStatus(200);
    });

    router.options('/formEditor/addNewQuestions', function(req, res) {
      res.header("Access-Control-Allow-Origin", "http://localhost:4200");
      res.header("Access-Control-Allow-Headers", ["access-control-allow-origin", "content-type"]);
      res.sendStatus(200);
    });

    router.post('/formEditor/submitForm', jsonParser, function(req, res) {
      // console.log("memes");
      var form = req.body;
      // console.log(form);
      dbService.updateForm(_db, form).then(q => {
        res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        if(q.success) {
          // console.log(q);
          if(q.modifiedCount === 0)
          {
            // console.log("Inserting new form");
            dbService.insertForm(_db, form).then(q2 => {
              if(q2.success){
                res.sendStatus(200);
              }
              else{
                res.sendStatus(400);
              }
            });
          }
          else
            res.sendStatus(200);
        }
        else {
          res.sendStatus(400);
        }
      });

    });

    router.post('/formEditor/addNewQuestions', jsonParser, function(req, res) {

      let questions = req.body;

      dbService.insertQuestions(_db, questions).then(q => {
        res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        if (q) {
          res.sendStatus(200);
        }
        else {
          res.sendStatus(400);
        }
      });
    });

    // router.post('/', jsonParser, function(req, res) {
    //
    // });

    router.put('/', jsonParser, function(req, res) {

        var form = req.body;
        dbService.updateForm(_db, form).then(q => {
            if (q) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(400);
            }
        });
    });

    router.delete('/:id', function(req, res){

        var id = req.params.id.toString();
        dbService.deleteForm(_db, id).then(q => {

            if (q) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(400);
            }
        });
    });

    router.get('/formEditor/allQuestions', jsonParser, function(req, res) {

      dbService.questionQuery(_db, {}).then(q => {
        if (q) {
          res.header("Access-Control-Allow-Origin", "http://localhost:4200");
          res.send(initialValues.initialQuestions.concat(q));
        }
        else {
          res.sendStatus(400);
        }
      });
    });

    router.get('/formEditor/formByName/:formName', jsonParser, function(req, res) {

      // console.log(req.params);
      let fName = req.params.formName;
      // console.log(fName);
      dbService.formQuery(_db, {name:fName}).then(q => {
        if (q) {
          dbService.questionQuery(_db, {}).then(q2 => {
            if (q2) {
              res.header("Access-Control-Allow-Origin", "http://localhost:4200");
              res.send({form: q, questions: initialValues.initialQuestions.concat(q2)});
            }
            else {
              res.sendStatus(400);
            }
          });
        }
        else {
          res.sendStatus(400);
        }
      });
    });


    return router;
}
