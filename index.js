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
    response.toptracks.track.filter(function(e) { return e.mbid; }).forEach(function (track) {
        mb.lookupRecording(track.mbid, [], function(err, release) {
            if (err) {
                return;
            }
            request({
                url: 'http://acousticbrainz.org/' + release.id + '/low-level',
                json: true
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log('%s - %s: %s', track.artist.name, track.name, body.rhythm.bpm);
                } else {
                    console.warn('Failed getting AcousticBrainz %s', track.name);
                }
            });
        })
    });
}
