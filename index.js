var LastFmNode = require('lastfm').LastFmNode;
var mb = require('musicbrainz');
var path = require('path');
var request = require('request');
var config = require('./config');
var SpotifyWebApi = require('spotify-web-api-node');

var lastfm = new LastFmNode({
    api_key: config.api_key,
    secret: config.secret
});

var spotify = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.secret
});

var express = require('express');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.get('/', function(req, res) {
    var user = req.query.user;
    if (user) {
        generatePlaylist(user, function(playlist, error) {
            if (error) {
                res.render('error', { error: error });
                return;
            }
            res.render('playlist', { tracks: playlist.tracks, uri: playlist.uri });
        });
    }
    else {
        res.render('index');
    }
});

var server = app.listen(3000, function() {
    console.log('running');
});

function generatePlaylist(user, callback) {
    lastfm.request('user.topTracks', {
        limit: 20,
        user: user,
        handlers: {
            success: function(data) {
                handleTopTracks(data, callback);
            },
            error: function(error) {
                console.error('Failed fetching from Last.fm API', error);
                callback(null, 'Failed fetching from Last.fm API');
            }
        }
    });
}

function handleTopTracks(response, callback) {
    var tracksWithMbid = response.toptracks.track.filter(function (e) {
        return e.mbid;
    });

    sortByMbid(tracksWithMbid, function(tracks) {
        createPlaylist(tracks, callback);
    });
}

function createPlaylist(tracks, callback) {
    appendSpotifyUris(tracks, function() {
        var playlist = { };
        playlist.tracks = tracks;
        playlist.uri = 'spotify:trackset:Playlist:';
        tracks.forEach(function(track) {
            playlist.uri += track.spotifyUri + ',';
        });
        callback(playlist);
    });
}

function appendSpotifyUris(tracks, callback) {
    trackCache = [];
    function addResolved(track) {
        trackCache.push(track);
        if (trackCache.length === tracks.length) {
            callback(trackCache.filter(function(track) {
                return track.spotifyUri
            }));
        }
    }

    tracks.forEach(function(track) {
        spotify.searchTracks('artist:' + track.artist.name + ' track:' + track.name)
            .then(function(data) {
                var item = data.tracks.items[0]
                track.spotifyUri = item.id;
                addResolved(track);
            }, function(err) {
                console.log('Failed getting spotify uri for ' + track.name);
                addResolved(track);
            });
    });
}

function sortByMbid(tracks, callback) {
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
        mb.lookupRecording(track.mbid, [], function(err, release) {
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
