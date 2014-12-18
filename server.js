
var assert = require('assert'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    connectMongo = require('connect-mongo'),
    debug = require('debug')('connect-mongo-ttl-err-test'),
    express = require('express'), 
    expressSession = require('express-session'),
    flash = require('connect-flash'),
    https = require('https'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    passportLocalMongoose = require('passport-local-mongoose'),
    passportSocketIo = require('passport.socketio'), 
    serveStatic = require('serve-static'),
    socketio = require('socket.io');

var ssl = require('./ssl');

var config = {
    port: 1337,
    mongodb: {
        "uri": "mongodb://localhost/connect-mongo-test",
        "options": {
            "auto_reconnect": true
        }
    }
};

var MongoStore = connectMongo(expressSession);

var AccountSchema = new mongoose.Schema({
    created: { type: Date, default: Date.now }
});

AccountSchema.plugin(passportLocalMongoose);

Accounts = mongoose.model('Account', AccountSchema);

var connection = mongoose.connection,
    io,
    online = [],
    server,
    clients = [];

mongoose.connect(config.mongodb.uri, config.mongodb.options);

// explicitly waiting for database to be open before configuring session
connection.once('open', function connectionOpen () {
    
    // createStrategy() returns the built-in strategy
    passport.use(Accounts.createStrategy());
    // serializeUser() and deserializeUser() return the functions passport will use
    passport.serializeUser(Accounts.serializeUser());
    passport.deserializeUser(Accounts.deserializeUser());

    var app = express(),   
        sessionConfig = {
            "cookie": { "maxAge" : 10*1000, "secure": true }, 
            "key": "example.sid",
            "resave": true,
            "saveUninitialized": false,
            "secret": "REALLY_SUPER_SECRET_EXAMPLE_SECRET",
            "store": new MongoStore({ mongoose_connection: connection })
        };


    app.set('port', config.port);
    app.set('views', 'views');
    app.set('view engine', 'jade');

    app.use(bodyParser.urlencoded({ extended: true }));
    
    app.use(cookieParser());
    app.use(expressSession(sessionConfig));

    app.use(flash());

    // setup passport
    app.use(passport.initialize());
    app.use(passport.session());

    // setup local variables for use in jade templates
    app.use(function (request, response, next){

        response.locals = {
            links: {
                home: '/'
            },
            request: request
        };

        next();
    });

    app.get('/', function (request, response) {
        response.render('root');
    });

    // GET requests for /logon will respond with the logon form
    app.get('/logon', function (request, response) {
        response.render('logon', { 
            error: request.flash('error'), 
            redir: request.flash('redir') 
        });
    });

    // GET requests for /logoff will kill the users session and redirect to root
    app.get('/logoff', function (request, response) {
        if (request.user) {
            request.logOut();
        }

        response.redirect('/');
    });

    app.get('/register', function (request, response) {
        response.render('register', {
            err: false, 
            redir: request.cookies.redir || '/logon'
        });
    });

    // POST requests for /logon will attempt to authenticate the given user
    app.post('/logon', passport.authenticate(
        'local', { 
            failureFlash: 'Authentication Failure.  Please try again.',
            failureRedirect: '/logon', 
            successRedirect: '/protected'
        })
    );

    app.post('/register', function (request, response) {
    
        // define the new account
        var newAccount = { username : request.body.username };

        if (request.body.password !== request.body.verifyPassword) {
            response.render('register', {
                request :   request
                , err: 'Passwords do not match!'
                , redir: request.redir || '/logon'
            });
        } else {
            Accounts.register(newAccount, request.body.password, function (err, account) {
                if (err) { 
                    fiveHundred(err, request, response);
                } else {
                    response.redirect('/');
                }
            });
        }

    }); 

    // verify the user's session then render view "protected"
    app.get('/protected', verifySession, function (request, response) {
        response.render('protected');
    });

    // serve static content like javascript files
    app.use(serveStatic('public'));

    // render 404 if a static file is not found
    app.use(function (request, response) { 
        response.render('errors/404'); 
    });

    // create the http server instance
    server = https.createServer(ssl.data, app);

    server.on('connection', function (client) {
        debug('client connect!');
        
        var clientFd = client._handle.fd;

        clients.push(clientFd);

        debug('clients', clients)

        client.on('close', function () {
            debug('client disconnect!');
        
            var index = clients.indexOf(clientFd);
            clients.splice(index, 1);

            debug('clients', clients)
        });
    });

    var authOptions = {
        cookieParser:   cookieParser, 
        key:            sessionConfig.key,
        secret:         sessionConfig.secret, 
        store:          sessionConfig.store
    }

    io = socketio(server);

    io.use(passportSocketIo.authorize(authOptions))
        .on('connect', function socketConnect (socket) {
        var user = socket.request.user;

        debug(user.username, 'connected')

        socket.emit('joined', 'You');
        socket.broadcast.emit('joined', user.username);

        online.push(user.username);


        socket.on('message', function (msg) {

            assert.notEqual('CRASH!', msg);
            
            debug(user.username, 'says:', msg);

            socket.emit('chat', 'You', msg)
            socket.broadcast.emit('chat', user.username, msg);
        });

        debug('online', online)

        socket.on('disconnect', function () {
            debug(user.username, 'disconnected');

            io.sockets.emit('left', user.username);
        
            var index = online.indexOf(user.username);
            online.splice(index, 1);

            debug('online', online)
        });
    });

    server.listen(config.port, function serverListerning () { 
        debug('the server is ready! https://localhost:' + config.port);    
    });

    function fiveHundred (err, request, response) {
        console.trace(err);
        response.render('errors/500', { err: err });
    };

    function verifySession (request, response, next) {
        if (request.isAuthenticated()) {
            debug ('request.user', request.user);
            debug('%s has authenticated', request.user.username);
            return next();

        } else  {
            debug('client has NOT authenticated');

            request.flash('error', 'You need to logon before you can visit ' + request.url );
            
            response.redirect('/logon');
        }
    };
});

