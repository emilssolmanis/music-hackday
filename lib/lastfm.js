var LastFmNode = require('lastfm').LastFmNode;

var config = require('../config');

var lastfm = new LastFmNode({
    api_key: config.lastfm.apiKey,
    secret: config.lastfm.secret
});

function fetchLastfmTopTracksSortedByBpm(callback) {
    lastfm.request('user.topTracks', {
        limit: 10,
        user: 'skmangal',
        handlers: {
            success: function(response) { handleTopTracks(response, callback); },
            error: function (error) {
                console.error('Failed fetching from Last.fm API', error);
            }
        }
    });
}

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
