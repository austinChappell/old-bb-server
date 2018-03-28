const bcrypt = require('bcryptjs'),
      { Client } = require('pg');

const { dbConfig } = require('../db.config');

const checkPassword = function(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

const checkUser = function(username, password, done) {
  const client = new Client(dbConfig);

  client.connect().then(() => {
    const sql = 'SELECT * FROM backbeatuser WHERE username = $1';
    const params = [username];

    return client.query(sql, params);
  }).then((results) => {
    console.log('username results', results.rows);
    const user = results.rows[0];

    if (user && checkPassword(password, user.password_hash)) {
      console.log('Should be a successful login');
      done(null, user);
    } else {
      console.log('The user probably entered the incorrect password');
      done(null, false);
    };
  });
};

module.exports = { checkUser };
