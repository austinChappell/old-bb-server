const router = require('express').Router();
const { Client } = require('pg');
const fs = require('fs');

const { dbConfig } = require('../db.config');

const RoutesHelper = require('./routes_helper');
const authRequired = RoutesHelper.authRequired;
const Mailer = require('./mail_helper');
const ClientHelper = require('./client_helper');

const cloudinary = require('cloudinary');
const nodemailer = require('nodemailer');
const moment = require('moment');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const emailHeader = Mailer.generateHeader();
const emailFooter = Mailer.generateFooter();

const User = require('../models/user');

let transporter = nodemailer.createTransport(Mailer.transport);

router.get('/messages/all', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT * FROM message
      JOIN backbeatuser ON id = sender_id
      WHERE sender_id = $1 OR recipient_id = $1
      ORDER BY message_id
  `;
  const params = [req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
})

router.get('/messages/unread', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT * FROM message
      WHERE recipient_id = $1 AND read = $2
      ORDER BY message_id
  `;
  const params = [req.session.user.id, false];
  ClientHelper.connect(req, res, sql, params, client);
})

router.get('/messages/:recipient_id', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT message_id, content, created_at, sender_id, recipient_id, read, sender_name, recipient_name, profile_image_url FROM message
      JOIN backbeatuser ON backbeatuser.id = sender_id
      WHERE (sender_id = $1 AND recipient_id = $2)
      OR (sender_id = $2 AND recipient_id = $1)
      ORDER BY message_id
    `;
  const params = [req.params.recipient_id, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
});

router.post('/message/send', authRequired, (req, res) => {
  const client = new Client(dbConfig);

  client.connect().then(() => {
    // const dateTime = moment().format("YYYY-MM-DD HH:mm:ss");

    const sql = `
    INSERT INTO message
      (content, created_at, sender_id, recipient_id, read, sender_name, recipient_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const sender = `${req.session.user.first_name} ${req.session.user.last_name}`;
    const recipient = `${req.body.recipientFirstName} ${req.body.recipientLastName}`;

    const params = [req.body.message, req.body.date, req.session.user.id, req.body.recipientId, true, sender, recipient];

    return client.query(sql, params);
  }).then((results) => {
    console.log('=============================')
    console.log('THE RESULTS', results)
    console.log('=============================')
    this.newMessageId = results.rows[0].message_id;

    res.json(results);
  }).catch((err) => {
    throw err;
  }).then(() => {
    client.end();
    console.log(this.newMessageId);
    const cancelEmail = setTimeout(() => {
      const mailClient = new Client(dbConfig);
      mailClient.connect().then(() => {
        const sql = `
          SELECT * FROM message
            WHERE message_id = $1
        `;

        const params = [this.newMessageId];

        return mailClient.query(sql, params);
      }).then((results) => {
        console.log('THE NEXT SET OF RESULTS=============================================================================================', results);
        if (results.rows[0].read === false) {
          const emailBody = `
          <table class="body">
            <tr class="greeting">
              <td>
                <p>
                  Hi ${req.body.recipientFirstName},
                </p>
              </td>
            </tr>
            <tr class="content">
              <td>
                <p>${req.session.user.first_name} ${req.session.user.last_name} has sent you a message. Log in to www.the-back-beat.com to read it.</p>
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
            to: req.body.recipientEmail,
            subject: `You Have a New Message | The Back Beat`,
            text: 'New Message',
            html: `${emailHeader} ${emailBody} ${emailFooter}`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
          })

        }
      }).catch((err) => {
        console.log('err', err);
      }).then(() => {
        mailClient.end();
      })
    }, 300000) // IF THE MESSAGE IS UNREAD FOR 5 MINUTES, SEND AN EMAIL
  })
})

router.put('/message/:id/markasunread', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    UPDATE message
      SET
        read = $1
      WHERE message_id = $2
      RETURNING *
  `;
  const params = [false, req.params.id];
  ClientHelper.connect(req, res, sql, params, client);
})

router.put('/message/:id/markasread', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    UPDATE message
      SET
        read = $1
      WHERE message_id = $2
      RETURNING *
  `;
  const params = [true, req.params.id];
  ClientHelper.connect(req, res, sql, params, client);
})

module.exports = router;
