const LocalStrategy = require('passport-local').Strategy;
const { Client } = require('pg');

const { dbConfig } = require('./db.config');

const User = require('./models/user');

function configure(passport) {
  const strategyFunc = function(username, password, done) {
    User.checkUser(username, password, function(err, user) {
      if (err) {
        console.log('Local Strategy - Error trying to authenticate.');
        done(err);
      } else if (user) {
        console.log('Local Strategy - Success');
        done(null, user);
      } else {
        console.log('Local Strategy - Could not find user');
        done(null, false);
      };
    });
  };
  passport.use(new LocalStrategy(strategyFunc));
  passport.serializeUser(function(user, done) {
    // console.log('serializeUser', user);
    done(null, user);
  });
  passport.deserializeUser(function(user, done) {
    // console.log('deserializeUser', user);
    const userId = user.id;
    const client = new Client(dbConfig);

    client.connect().then(() => {
      const sql = 'SELECT * FROM backbeatuser WHERE id = $1';
      const params = [userId];

      return client.query(sql, params);
    }).then((results) => {
      const user = results.rows[0];
      done(null, user);
    }).catch((err) => {
      throw err;
    }).then(() => {
      client.end();
    });
  });
};

module.exports = { configure };
