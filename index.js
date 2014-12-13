var LastFmNode = require('lastfm').LastFmNode;
var mb = require('musicbrainz');
var request = require('request');
var config = require('./config');
var SpotifyWebApi = require('spotify-web-api-node');
var google = require('googleapis');
var fitness = google.fitness('v1');

var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2(config.google.clientId, config.google.clientSecret, config.google.oauthRedirectUrl);

var lastfm = new LastFmNode({
    api_key: config.api_key,
    secret: config.secret
});

var spotify = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.secret
});

if (!config.google.tempAuthCode) {
    var scopes = [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.activity.write',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.body.write',
        'https://www.googleapis.com/auth/fitness.location.read',
        'https://www.googleapis.com/auth/fitness.location.write'
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
        scope: scopes // If you only need one scope you can pass it as string
    });

    console.log('oauth auth url %s', url);
    console.log('make sure you have a server running on ', config.google.oauthRedirectUrl);
} else if (!config.google.tokens.auth) {
    oauth2Client.getToken(config.google.tempAuthCode, function (err, tokens) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if (!err) {
            console.log(tokens);
            oauth2Client.setCredentials(tokens);
            google.options({auth: oauth2Client});

            fetchGoogleFitness(function (err, response) {
                if (!err) {
                    console.log(response.body);
                } else {
                    console.error('Error listing users datasources', err);
                }
            });
            //fetchLastfmTopTracks();
        } else {
            console.error('Failed to auth against Google stuff', err);
        }
    });
} else {
    oauth2Client.setCredentials({
        access_token: config.google.tokens.auth,
        token_type: 'Bearer',
        expiry_date: config.google.tokens.expiry,
        refresh_token: config.google.tokens.refresh
    });
    google.options({auth: oauth2Client});

    fetchGoogleFitness(function (err, response) {
        if (!err) {
            console.log(response);
        } else {
            console.error('Error listing users datasources', err);
        }
    });
    //fetchLastfmTopTracks();
}

function fetchGoogleFitness(callback) {
    fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:fm.last.heart_rate:407408718192:Example Manufacturer:ExampleTablet:1000001:music hack day',
        datasetId: '1411053997000000000-1411057556000000000'
    }, callback);
}

function fetchLastfmTopTracks() {
    lastfm.request('user.topTracks', {
        limit: 10,
        user: 'EsmuPliks',
        handlers: {
            success: handleTopTracks,
            error: function (error) {
                console.error('Failed fetching from Last.fm API', error);
            }
        }
    });
}

function handleTopTracks(response) {
    var tracksWithMbid = response.toptracks.track.filter(function (e) {
        return e.mbid;
    });

    sortByBpm(tracksWithMbid, function (tracks) {
        createPlaylist(tracks, console.log);
    });
}

function createPlaylist(tracks, callback) {
    appendSpotifyUris(tracks, function () {
        var playlist = 'spotify:trackset:Playlist:' + tracks.map(function (t) {
                return t.spotifyUri;
            }).join(',');
        callback(playlist);
    });
}

function appendSpotifyUris(tracks, callback) {
    var trackCache = [];

    function addResolved(track) {
        trackCache.push(track);
        if (trackCache.length === tracks.length) {
            callback(trackCache.filter(function (track) {
                return track.spotifyUri
            }));
        }
    }

    tracks.forEach(function (track) {
        spotify.searchTracks('artist:' + track.artist.name + ' track:' + track.name)
            .then(function (data) {
                var item = data.tracks.items[0]
                track.spotifyUri = item.id;
                addResolved(track);
            }, function (err) {
                console.log('Failed getting spotify uri for ' + track.name);
                addResolved(track);
            });
    });
}

function sortByBpm(tracks, callback) {
    var trackCache = [];

    function addResolved(track) {
        trackCache.push(track);
        if (trackCache.length === tracks.length) {
            callback(trackCache.filter(function (t) {
                    return t.bpm;
                }).sort(function (a, b) {
                    return a.bpm - b.bpm;
                })
            );
        }
    }

    tracks.forEach(function (track) {
        mb.lookupRecording(track.mbid, [], function (err, release) {
            if (err) {
                addResolved(track);
            }
            request({
                url: 'http://acousticbrainz.org/' + release.id + '/low-level',
                json: true
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log('%s - %s: %s', track.artist.name, track.name, body.rhythm.bpm);
                    track.bpm = body.rhythm.bpm;
                    addResolved(track);
                } else {
                    console.warn('Failed getting AcousticBrainz %s', track.name);
                    addResolved(track);
                }
            });
        })
    });

}
