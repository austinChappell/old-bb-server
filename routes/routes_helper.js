const RoutesHelper = {

  authRequired: function(req, res, next) {
    // if (req.user) {
    //     next();
    // } else {
    //     res.redirect('/');
    // };

    if (req.query.token === req.session.token) {
      next();
    } else {
      res.redirect('/');
    }

  }

};

module.exports = RoutesHelper;
