const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routes/route');
const mongoose = require('mongoose');
const app = express();
const multer= require("multer");

app.use(multer().any())

app.use(bodyParser.json());

mongoose.connect("mongodb+srv://RahulSinghDhek:IQpy326QQQKAkK2J@cluster0.dxzlfnc.mongodb.net/group6Database?retryWrites=true&w=majority", {
    useNewUrlParser: true
})
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))


app.use('/', route);


app.listen(  3000, function () {
    console.log('Express app running on port ' + ( 3000))
});