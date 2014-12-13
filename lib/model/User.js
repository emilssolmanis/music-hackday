var mongoose = require('mongoose');


exports.User = mongoose.model('User', {
    lastfm: {
        username: String,
        tracks: [{
            name: String,
            bpm: Number,
            mbid: String,
            arist: {
                name: String
            }
        }]
    },
    google: {
        tokens: {
            auth: String
        }
    }
});
