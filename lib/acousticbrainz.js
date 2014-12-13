var request = require('request');

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
