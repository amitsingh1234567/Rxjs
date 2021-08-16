const rateLimit = require('express-rate-limit');

// Method created by ME also bootforseAttack.js file created by ME
exports.limit =  rateLimit({
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});

exports.limit2 =  rateLimit({
    max: 5,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});        
