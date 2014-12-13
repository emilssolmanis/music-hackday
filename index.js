var LastFmNode = require('lastfm').LastFmNode;
var mb = require('musicbrainz');
var request = require('request');
var config = require('./config');

var lastfm = new LastFmNode({
    api_key: config.api_key,
    secret: config.secret
});

lastfm.request('user.topTracks', {
    limit: 20,
    user: 'EsmuPliks',
    handlers: {
        success: handleTopTracks,
        error: function(error) {
            console.error('Failed fetching from Last.fm API', error);
        }
    }
});

function handleTopTracks(response) {
    var tracksWithMbid = response.toptracks.track.filter(function (e) {
        return e.mbid;
    });

    sortByMbid(tracksWithMbid, function (sortedTracks) {
        console.log('   SORTED', sortedTracks);
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