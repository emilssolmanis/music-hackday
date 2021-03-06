var config = require('../config');

var google = require('googleapis');
var fitness = google.fitness('v1');
var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2(config.google.clientId, config.google.clientSecret, config.google.oauthRedirectUrl);

//var DATA_SOURCE_ID = 'derived:fm.last.heart_rate:407408718192:Example Manufacturer:ExampleTablet:1000001:music hack day';
var DATA_SOURCE_ID = 'derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas';

var SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read'
];

exports.makeUserAuthUrl = function () {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
};

exports.getUserOAuthCredentials = function(tempToken, callback) {
    oauth2Client.getToken(tempToken, function (err, tokens) {
        if (!err) {
            callback(null, tokens);
        } else {
            callback(err);
        }
    });
};

//if (!config.google.tempAuthCode) {
//    console.log('oauth auth url %s', url);
//    console.log('make sure you have a server running on ', config.google.oauthRedirectUrl);
//} else if (!config.google.tokens.auth) {
//    oauth2Client.getToken(config.google.tempAuthCode, function (err, tokens) {
//        // Now tokens contains an access_token and an optional refresh_token. Save them.
//        if (!err) {
//            console.log(tokens);
//            oauth2Client.setCredentials(tokens);
//            google.options({auth: oauth2Client});
//
//            fetchGoogleFitness(function (err, response) {
//                if (!err) {
//                    console.log(response.body);
//                } else {
//                    console.error('Error listing users datasources', err);
//                }
//            });
//            //fetchLastfmTopTracksSortedByBpm();
//        } else {
//            console.error('Failed to auth against Google stuff', err);
//        }
//    });
//} else {
//    oauth2Client.setCredentials({
//        access_token: config.google.tokens.auth,
//        token_type: 'Bearer',
//        expiry_date: config.google.tokens.expiry,
//        refresh_token: config.google.tokens.refresh
//    });
//    google.options({auth: oauth2Client});
//
//    fetchGoogleFitness(function (err, response) {
//        if (!err) {
//            var heartRate = response.point[0].value[0].fpVal * 2;
//            fetchLastfmTopTracksSortedByBpm(function (sortedTracks) {
//                var closestTrack = sortedTracks.map(function (track) {
//                    track.deltaBpm = Math.abs(track.bpm - heartRate);
//                    return track;
//                }).sort(function (a, b) {
//                    return b.deltaBpm - a.deltaBpm;
//                }).pop();
//                console.log('Closest to heartRate %s -- %s by %s @ %s', heartRate, closestTrack.name,
//                    closestTrack.artist.name, closestTrack.bpm)
//            });
//        } else {
//            console.error('Error listing users datasources', err);
//        }
//    });
//    //fetchLastfmTopTracksSortedByBpm();
//}

exports.fetchGoogleFitness = function (user, callback) {
    var localOauth2Client = new OAuth2(config.google.clientId, config.google.clientSecret);
    localOauth2Client.setCredentials({
        access_token: user.google.tokens.auth
    });

    var endTime = new Date().getTime() + '000000';

    fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: DATA_SOURCE_ID,
        datasetId: '0-' + endTime,
        auth: localOauth2Client
    }, callback);
};
