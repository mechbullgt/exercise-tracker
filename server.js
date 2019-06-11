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

// * unixDate key was added for sorting the excercises
var exerciseSchema = new Schema({
    "username": {
        type: String,
        required: true
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
    },
    "unixDate": {
        type: String
    }
});
var Exercise = mongoose.model('Exercise', exerciseSchema, 'excercises');

var username;
// * API to add excercises for a user
app.post('/api/exercise/add', (req, res) => {
    let reqBody = req['body'];
    console.log('reqBody :', reqBody);
    let userId = reqBody['userId'];
    let description = reqBody['description'];
    let duration = reqBody['duration'];
    let reqDate = reqBody['date'];
    let getDate = (reqDate) => {
        let dnow;
        if (reqDate.length == 0) {
            dnow = Date.now();
            console.log('dnow :', dnow);
        } else {
            // * Returning date in unix format for sorting
            dnow = reqDate;
            console.log('dnow :', dnow);
        }
        return dnow;
    };

    let exerciseDate = getDate(reqDate);
    let date = (new Date(exerciseDate).toUTCString()).substring(0, 16);
    let unixDate = exerciseDate;
    console.log('unixDate :', unixDate);

    // * Getting user information from the user-details collection
    let getUsername = getUsernameFromUserId(userId);
    getUsername.then((data) => {
        username = data;
        // * Only create the exercise if the username is found i.e, not undefined
        if (username !== undefined) {
            console.log('username from postAPI :', username);
            console.log("Found user, now creating exercise");
            console.log('username :', username);
            let exerciseObj = new Exercise({
                "username": username,
                "description": description,
                "duration": duration,
                "id": userId,
                "date": date,
                "unixDate": unixDate
            });
            console.log('exerciseObj :', exerciseObj);
            createExercise(exerciseObj, handlerForCreateExercie);
            res.json({
                "username": username,
                "description": description,
                "duration": duration,
                "_id": userId,
                "date": date
            });
        } else {
            // * Incase the username is not found, i.e, undefined
            console.log("User doesn't exit");
            res.send("User doesn't exits");
        }
    })

    // ! Callback based method to create Exercise
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
        console.log('User exercise created:', data);
        return data;
    }
});

// * Function to get the username based on the userId enterned by the user
async function getUsernameFromUserId(userId) {
    let username;
    let foundData = Username.find({ 'id': userId })
        .then((data) => {
            if (data !== undefined) {
                console.log(data);
                username = data[0]['username'];
                console.log('Success user found! :', username);
            }
        }).catch((err) => {
            console.log("Error finding the user:", err);
        });
    // ? Very important step, based on the await we can get the username or not
    await foundData;
    console.log('username from async function :', username);
    return username;
}

// ! API to get the exercises based on the query parameters
// todo Sample query http://localhost:3000/api/exercise/log?userId=r0e3uaj22&from=20190520&to=20190529&limit=1
// todo Mongo query that needs to be implemented db.getCollection('excercises').find({$and: [{'username':'terminator1991'},{'unixDate':{$gte:'2019-05-28'}} ,{'unixDate':{$lte:'2019-05-31'}}]}).limit(1);
app.get("/api/exercise/log", (req, res) => {
    let searchQuery = req.query;
    let userId;
    let username;
    let limitValue;
    let fromDate;
    let toDate;
    console.log('query :', searchQuery);
    let searchResponse = function searchResponseHandler(query) {
        let responseObj = {};
        let getUsername;
        let queryKeys = Object.keys(query);
        console.log('queryKeys :', queryKeys);
        // * The keys must contain the userId else we'll show message
        let userIdStatus = queryKeys.includes('userId');
        console.log('userIdStatus:',userIdStatus);
        userId = query['userId'];
        fromDate=query['from'];
        toDate= query['to'];
        console.log('userId :', userId);
        if (!userIdStatus || userId == undefined || userId.length == 0) {
            responseObj.message = 'UserId/username not found';
            res.json(responseObj);
        } else {
            getUsername = getUsernameFromUserId(userId).then((data) => {
                username = data;
                console.log('username :', username);
                searchQueryChain(username, query, handlerForQueryChain);
            });
        }
    };

    searchResponse(searchQuery);
    // todo Error handling for negative scenarios is pending
    var searchQueryChain = function (username, query, done) {
        limitValue = parseInt(query['limit']);
        let dbQuery = Exercise.find();
        dbQuery.where('username').equals(username);
        dbQuery.or[{date:{$gte:fromDate}},{date:{$lte:toDate}}];
        dbQuery.select('description duration date -_id');
        dbQuery.limit(limitValue);
        dbQuery.exec((err, data) => {
            if (err) done(err);
            done(null, data);
        })
    };
    function handlerForQueryChain(err, data) {
        if (err) {
            console.log('Err occurred in query chain:', err);
        }
        console.log('Query chain execution successfull');
        console.log('data from chain execution :', data);
        res.json({
            '_id':userId,
            'username':username,
            'from':fromDate,
            'to':toDate,
            'count':(data===undefined)?0:data.length,
            'log':data
        });
    }

});




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
    console.log('Error Message', errMessage);
    res.status(errCode).type('txt')
        .send(errMessage);
})

var PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("App is listening at: ", PORT);
});