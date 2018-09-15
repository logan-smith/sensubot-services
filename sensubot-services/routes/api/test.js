var router = require('express').Router();

module.exports = function(users, _db){
  router.use('/', function(req, res, next) {
    console.log('t %s, %s, %s', req.method, req.url, req.path);
    next();
  });
    router.get('/', function(req, res){
      console.log("dog");
        res.send('hello world');
    });

    return router;
}
