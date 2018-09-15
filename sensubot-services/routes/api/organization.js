var router = require('express').Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var dbService = require('../../services/dbservice.js');

module.exports = function(_db){
    router.get('/:username', function(req, res) {
        var username = req.params.username.toString();
        dbService.getOrganizationByName(_db, username).then(q => {
            if (q) {
                var org = q[0];
                dbService.getFormsByUserId(_db, org._id).then(r => {
                    if (r) {
                        res.send({
                            org: org,
                            forms: r
                        });
                    }
                    else {
                        res.send(400);
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