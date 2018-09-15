var router = require('express').Router();

//router.use('/', require('./api'));


module.exports = function(users, _db){

  // router.use('/', function(req, res, next) {
  //   console.log('%s, %s, %s', req.method, req.url, req.path);
  //   next();
  // });
    router.use('/', require('./api/index.js')(users, _db));

    return router;
}
