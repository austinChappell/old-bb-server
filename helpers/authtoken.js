const jwt = require('jsonwebtoken');

const authToken = {
  send: function() {
    const token = jwt.sign({ foo: 'bar' }, 'secret');
    return token;
  }
}

module.exports = authToken;
