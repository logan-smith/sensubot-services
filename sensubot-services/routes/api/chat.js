var router = require('express').Router();

router.get('/', function(req, res) {
    res.send('Chat Server');
});

module.exports = router;