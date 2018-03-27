const ClientHelper = {
  connect: function(req, res, sql, params, client) {
    client.connect().then(() => {
      return client.query(sql, params);
    }).then((results) => {
      res.json(results);
    }).catch((err) => {
      console.log('error', err);
    }).then(() => {
      client.end();
    })
  }
}

module.exports = ClientHelper;