const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || '3000';

var env = require('dotenv').config();
var _ = require('lodash');
var socketEvents = null;
var storage = require('node-persist');
storage.initSync();
var users = require('./modules/users.js')(storage);
var MongoClient = require('mongodb').MongoClient;
let _db = null;

// Switch to this for server database
// MongoClient.connect("mongodb://10.171.204.175:27017/sensudb", function(err, db) {
MongoClient.connect("mongodb://"+process.env.DB_USER+":"+process.env.DB_PASS+"@ds115396.mlab.com:15396/sensudb", function(err, db) {
// MongoClient.connect("mongodb://localhost:27017/sensudb", function(err, db) {
    if(!err) {
        _db = db;
        socketEvents = require('./modules/socketEvents.js')(io, users, _db, app);
        app.use(require('./routes')(users, _db));
        console.log("We are connected");
    }
    else {
        console.log(err);
        console.log("There was an error connecting to the database");
    }
});


app.use(bodyParser.urlencoded({ extended: true }))

http.listen(port, function(){
    console.log('Server started on localhost:' + port);
});
