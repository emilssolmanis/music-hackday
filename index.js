var config = require('./config');

var path = require('path');


var mongoose = require('mongoose');
mongoose.connect(config.mongo.connectString);

var google = require('./lib/google');
var User = require('./lib/model/User').User;

var express = require('express');
var cookieParser = require('cookie-parser')

var app = express();
app.use(cookieParser())
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.get('/user/:user', function(req, res) {
    var lastfmUsername = req.params.user;
    console.log('User: %s', lastfmUsername);
    User.findOne({"lastfm.username": lastfmUsername}, function (err, user) {
        if (err) {
            res.render('error', {
                error: 'Error looking up user ' + user + '; ' + err
            });
        } else {
            if (!user || !user.google.tokens.auth) {
                console.log('Couldnt find user %s : %s', lastfmUsername, user);
                res.cookie('lastfm-username', lastfmUsername);
                res.redirect(google.makeUserAuthUrl());
            } else {
                console.log('Found authenticated user %s', user);
                google.fetchGoogleFitness(user, function (err, response) {
                    if (!err) {
                        console.log(response);
                        res.render('index');
                    } else {
                        console.error(err);
                        res.render('error', {
                            error: 'Failed to fetch Google Fitness for ' + lastfmUsername + '; ' + JSON.stringify(err)
                        });
                    }
                });
            }
        }
    });
});

app.get('/googleauth/', function (req, res) {
    var lastfmUsername = req.cookies['lastfm-username'];
    var tempAuthToken = req.query.code;

    google.getUserOAuthCredentials(tempAuthToken, function (err, tokens) {
        if (!err) {
            var user = User({
                lastfm: {
                    username: lastfmUsername
                },
                google: {
                    tokens: {
                        auth: tokens.access_token
                    }
                }
            });
            user.save(function(err, user) {
                if (!err) {
                    console.log('Saved user, returning to index');
                    res.redirect('/user/' + lastfmUsername);
                } else {
                    res.render('error', {
                        error: 'Failed to save user ' + lastfmUsername + ' to Mongo; ' + err
                    });
                }
            });
        } else {
            res.render('error', {
                error: 'Failed to Google auth user ' + lastfmUsername + '; ' + err
            });
        }
    });
});


var server = app.listen(config.port || 3000, function() {
    console.log('running on', config.port || 3000);
});
