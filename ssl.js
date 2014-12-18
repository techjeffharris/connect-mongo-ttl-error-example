// node core
var fs = require('fs'),
    path = require('path');

var config = {
    "cert": ".ssl/connect-mongo-test-cert.pem",
    "key": ".ssl/connect-mongo-test-key.pem",
}

var ssl = {
    data : {
        cert : fs.readFileSync(path.resolve(config.cert)).toString('ascii'),
        key : fs.readFileSync(path.resolve(config.key)).toString('ascii')
    }, 
    path : { 
        cert : path.resolve(config.cert), 
        key : path.resolve(config.key)
    }
};

module.exports = ssl;

// console.log('ssl.path', ssl.path);
