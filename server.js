"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
require('dotenv').config();

// ! Express used
var app = express();
app.use(cors());

// ! Connect to the database
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', () => {
    console.log("Success! Connected to the db");
})
mongoose.connection.on('error', (err) => {
    console.log("Error with database connection: ", err);
})

// ! Body Parser used
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

// ! Static Files Served
app.use(express.static('public'));

// * Default route '/' -> index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.get('/api/hi', (req, res) => {
    res.json({
        "message": "Hi! From Hi API"
    });
});

// * Sehema for the new user to be created for the exercise
// ! We are using the _id provided by default, and our id is a radmon 9 char String
var userSchema = new Schema({
    username: {
        type: String
    },
    id: {
        type: String,
    }
});

// * The Model
var Username = mongoose.model('Username', userSchema, 'user-details');

// ! API to create new user for execise tracking
app.post('/api/exercise/new-user', (req, res) => {
    let username = req['body']['username'];
    let userId = getUserId();
    console.log('reqs.param :', username);
    var usernameObject = new Username({
        'username': username,
        'id': userId
    });
    var createUser = function (usernameObj, done) {
        usernameObj.save((err, data) => {
            if (err) done(err);
            done(null, data);
        });
    }

    function handlerForCreateUser(err, data) {
        if (err) {
            console.log('Error while creating user:', err);
        }
        console.log('Success, user added:', data);
        res.json({
            'username': username,
            'id': userId
        });
    }

    createUser(usernameObject, handlerForCreateUser);
});

// * Get a 9 character userId mostly random
function getUserId() {
    let r = Math.random().toString(36).substring(2, 11);
    console.log("random", r);
    return r;
}

var exerciseSchema = new Schema({
    "username": {
        type: String
    },
    "description": {
        type: String
    },
    "duration": {
        type: Number
    },
    "id": {
        type: String
    },
    "date": {
        type: String
    }
});
var Exercise = mongoose.model('Exercise', exerciseSchema, 'excercises');

// * API to add excercises for a user
app.post('/api/exercise/add', (req, res) => {
    let reqBody = req['body'];
    console.log('reqBody :', reqBody);
    let userId = reqBody['userId'];
    let username;
    let userStatus = (async function getStaus(){
        return await getUserStatus(userId);
    })();
    console.log('userStatus 1 :', userStatus);
    let description = reqBody['description'];
    let duration = reqBody['duration'];
    let date = reqBody['date'];
    var createExercise = function (exercise, done) {
        exercise.save((err, data) => {
            if (err) done(err);
            done(null, data);
        });
    }

    function handlerForCreateExercie(err, data) {
        if (err) {
            console.log('Error occured while creating exercise:', err);
        }
        console.log(data);
        return data;
    }

    if (userStatus) {
        console.log("Found user, now creating exercise");
        let exerciseObj = new Exercise({
            "username": username,
            "description": description,
            "duration": duration,
            "id": userId,
            "date": date
        });
        let data = createExercise(exerciseObj, handlerForCreateExercie);
        console.log('data after creation :', data);
    } else {
        res.send("User doesn't exit");
        return;
    }
});

async function getUserStatus(userId) {
    let username;
    let userStatus;
    Username.find({ '_id': userId }).then((data) => {
        if (data.length > 0) {
            console.log(data);
            username = data[0]['username'];
            console.log('Success user found! :', username);
            userStatus = true;
            console.log('userStatus 1 :', userStatus);
        } else {
            console.log("Failed, user not found");
            userStatus = false;
            console.log('userStatus 2 :', userStatus);
        }
        return userStatus;
    }).catch((err) => {
        console.log("Error finding the user:", err);
    });
}


// * Not found middleware
app.use((req, res, next) => {
    return next({
        'Status': 404,
        'message': "Not found"
    })
})

// * Error handling middle ware
app.use((err, req, res, next) => {
    let errCode, errMessage;
    if (err.errors) {
        // mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors)
        // report the first validation error
        errMessage = err.errors[keys[0]].message
    } else {
        // generic or custom error
        errCode = err.status || 500
        errMessage = err.message || 'Internal Server Error'
    }
    console.log('Errcode: ', errCode);
    res.status(errCode).type('txt')
        .send(errMessage);
})

var PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("App is listening at: ", PORT);
});