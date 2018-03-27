const express = require('express'),
      app = express(),
      bodyParser = require('body-parser'),
      cookieParser = require('cookie-parser'),
      expressValidator = require('express-validator'),
      http = require('http'),
      https = require('https'),
      socket = require('socket.io'),
      passport = require('passport'),
      session = require('express-session');

require('dotenv').config();

let port = process.env.PORT || 5000;
let clientUrl = process.env.CLIENT;
let serverUrl = process.env.SELF;

console.log('ENVIRONMENT', process.env.NODE_ENV);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', true);
  // res.header('Access-Control-Allow-Origin', *);
  res.header('Access-Control-Allow-Origin', process.env.CLIENT);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Max-Age', 1728000);

  next();
});

app.use(express.static('public'));
// app.use(corsPrefetch);

app.use(session({
  secret: 'brothersofgroove',
  resave: false,
  saveUninitialized: false,
  // cookie: {
  //   secure: false
  // },

  path:"/*" //NEEDED
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({limit: "50mb"}));
app.use(cookieParser('brothersofgroove'));
app.use(passport.initialize());
app.use(passport.session());
require('./passportconfig').configure(passport);

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/general'));
app.use('/', require('./routes/bands'));
app.use('/', require('./routes/messages'));
app.use('/', require('./routes/performed_with'));
app.use('/', require('./routes/skills'));

server = app.listen(port, () => {
  console.log(`Your server is running on PORT ${ port }.`);
})


io = socket(server);

io.on('connection', (socket) => {
  console.log('socket id', socket.id);
  // here you can start emitting events to the client
  socket.on('SEND_MESSAGE', function() {
    io.emit('RECEIVE_MESSAGE');
  })

  socket.on('SEND_INDIVIDUAL_MESSAGE', function(data) {
    io.emit('RECEIVE_INDIVIDUAL_MESSAGE', data);
  })

  socket.on('READ_MESSAGE', function() {
    io.emit('MESSAGE_READ');
  })

  socket.on('MARK_MESSAGE_UNREAD', function() {
    io.emit('RECEIVE_UNREAD_MESSAGE');
  })

  socket.on('MESSAGE_TYPING', function(user) {
    io.emit('NOTIFY_TYPING', user);
  })

  socket.on('STOP_TYPING', () => {
    io.emit('REMOVE_TYPING_USER');
  })
});
