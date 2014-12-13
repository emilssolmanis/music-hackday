var config = require('../config');

var SpotifyWebApi = require('spotify-web-api-node');

var spotify = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.secret
});

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
