"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var mongoose = require('mongoose');
require('dotenv').config();

// ! Express used
var app = express();
app.use(cors());

// ! Connect to the database
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected',()=>{
    console.log("Success! Connected to the db");
})
mongoose.connection.on('error',(err)=>{
    console.log("Error with database connection: ",err);
})

// ! Body Parser used
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());

// ! Static Files Served
app.use(express.static('public'));

// * Default route '/' -> index.html
app.get('/',(req, res)=>{
    res.sendFile(__dirname+"/views/index.html");
});

app.get('/api/hi',(req, res)=>{
    res.json({
        "message":"Hi! From Hi API"
    });
});

// * Not found middleware
app.use((req, res, next)=>{
    return next({
        'Status':404,
        'message':"Not found"
    })
})

// * Error handling middle ware
app.use((err, req, res, next)=>{
    let errCode, errMessage;
    if(err.errors){
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
      res.status(errCode).type('txt')
      .send(errMessage);
})

var PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log("App is listening at: ",PORT);
});