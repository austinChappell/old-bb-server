const express = require('express'),
      bcrypt = require('bcryptjs'),
      { Client } = require('pg'),
      passport = require('passport'),
      router = express.Router();

const { dbConfig } = require('../db.config');
const User = require('../models/user');
const nodemailer = require('nodemailer');
// const authToken = require('./../helpers/authToken');
const jwt = require('jsonwebtoken');

const d = new Date();
const year = d.getFullYear();

const emailHeader = `
<html>
<body>
  <style>
    body {
      margin: 30px auto;
      font-family: sans-serif;
      max-width: 600px;
      background-color: #DDDDDD;
    }

    .header {
      background-color: #070948;
      color: white;
      padding: 20px;
      font-size: 36px;
      text-transform: uppercase;
      text-align: center;
      width: 100%;
      border-radius: 5px 5px 0 0;
    }

    .body {
      margin: 0 auto;
      padding: 40px;
      max-width: 600px;
      background-color: #FFFFFF;
      min-height: 400px;
    }

    thead, tbody, tr, td, th {
      display: block;
    }

    .content {
      text-align: center;
    }

    .cta-button {
      background-color: #9A6197;
      color: white;
      padding: 10px 16px;
      border-radius: 20px;
      text-decoration: none;
      margin: 20px;
      display: inline-block;
    }

    .cta-button:hover {
      background-color: #894586;
    }

    .footer {
      background-color: #070948;
      color: white;
      padding: 10px;
      font-size: 14px;
      text-align: center;
      width: 100%;
      border-radius: 0 0 5px 5px;
    }

    .footer p {
      text-align: center;
    }

    p {
      margin: 12px 0;
      line-height: 1.5em;
      text-align: left;
    }
  </style>

  <table class="header">
    <tr>
      <td>
        The Back Beat
      </td>
    </tr>
  </table>
`;

const emailFooter = `
      <table class="footer">
        <tr>
          <td>
            <p>
              &copy; ${year} The Back Beat
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>`
;

router.post('/login', passport.authenticate('local', {
  // TODO: THIS NEEDS TO GO FOR FIREFOX BUG
  // successRedirect: '/backbeat',
  // failureRedirect: '/notloggedin',
  // failureFlash: true
  session: false
}),
  (req, res) => {
    // const token = authToken.send();
    const token = jwt.sign({ foo: 'bar' }, 'secret');
    req.session.token = token;
    req.session.user = req.user;
    console.log('session', req.session);
    res.status(200).json({
      userid: req.user.id,
      token
    });
  }
);

router.post('/signup', (req, res, next) => {

  const firstName = req.body.firstName,
        lastName = req.body.lastName,
        email = req.body.email,
        username = req.body.username,
        password = req.body.password,
        city = req.body.city,
        skillLevel = req.body.skillLevel,
        bio = req.body.bio,
        activationKey = req.body.activation_key;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const client = new Client(dbConfig);

  console.log('USER SIGN UP BIO', bio);

  client.connect().then(() => {
    const sql = `
      INSERT INTO backbeatuser
        (first_name, last_name, email, username, password_hash, city, skill_level, onboarding_stage, bio, is_active, activation_key, profile_image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

    let params = [firstName, lastName, email, username, passwordHash, city, skillLevel, 0, bio, false, activationKey, process.env.DEFAULT_PROFILE_IMAGE];

    params = params.map((param) => {
      if (param === '') {
        param = null;
      };
      return param;
    });

    return client.query(sql, params);
  }).then((results) => {
    const user = results.rows[0];

    let transporter = nodemailer.createTransport({
      // host: 'smtp.gmail.com',
      // port: 465,
      // secure: true,
      // auth: {
      //   user: 'thebackbeatproject@gmail.com',
      //   pass: process.env.EMAILPASS
      // }
      host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "5bd2bd76064b1a",
        pass: "2f5d62f63c74b1"
      }
    });

    const emailBody = `
    <table class="body">
      <tr class="greeting">
        <td>
          <p>
            Hi ${user.first_name},
          </p>
        </td>
      </tr>
      <tr class="content">
        <td>
          <p>
            Welcome to The Back Beat! Please verify your email address and start connecting with musicians in your area!
          </p>
          <a class="cta-button" href="${process.env.CLIENT}/#/activate/${username}/${activationKey}">Confirm My Account</a>
          </form>
        </td>
      </tr>
      <tr class="closing">
        <td>
          <p>
            Keep Jammin',
          </p>
          <p>
            The Back Beat
          </p>
        </td>
      </tr>
    </table>
    `;

    let mailOptions = {
      from: '"The Back Beat" <thebackbeatproject@gmail.com>',
      to: user.email,
      subject: 'Thank you for signing up with The Back Beat!',
      text: '',
      html: `${emailHeader} ${emailBody} ${emailFooter}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    })

  }).then(() => {
    next();
  }).catch((err) => {
    console.log('SIGN UP ERROR', err);
    // TODO: THIS NEEDS TO GO FOR FIREFOX BUG
    res.redirect('/');
  }).then(() => {
    client.end();
  });

}, passport.authenticate('local', {
  // TODO: THIS NEEDS TO GO FOR FIREFOX BUG
  // res.json({ greeting: 'hello' });
  successRedirect: '/backbeat'
}));

router.post('/logout', (req, res) => {
  console.log('logging out');
  req.logout();
  // res.redirect('/');
});

module.exports = router;
