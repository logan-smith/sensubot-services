var router = require('express').Router();

module.exports = function(users, _db){
  // router.use('/', function(req, res, next) {
  //   console.log('1 %s, %s, %s', req.method, req.url, req.path);
  //   next();
  // });
    router.use('/', require('./chat'));
    router.use('/test', require('./test')(users, _db));
    router.use('/webhook', require('./webhook')(users, _db));
    router.use('/forms', require('./forms')(_db));
    router.use('/alexa', require('./alexa')(users, _db));
    router.use('/organization', require('./organization')(_db));

    return router;
}
