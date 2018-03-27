const router = require('express').Router();
const { Client } = require('pg');
const fs = require('fs');

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

// MAKE A REQUEST TO ADD A PERFORMER
router.post('/api/perform/add', authRequired, (req, res) => {
  const client = new Client();
  const sql = `
    INSERT INTO perform_with
      (performer_1_id, performer_2_id, confirmed)
      VALUES ($1, $2, $3)
      RETURNING *
  `;
  const params = [req.session.user.id, req.body.recipientid, false];
  ClientHelper.connect(req, res, sql, params, client);
})

// GET PERFORMER REQUESTS FOR THE LOGGED IN USER
router.get('/api/performers/requests', authRequired, (req, res) => {
  const client = new Client();
  const sql = `
    SELECT * FROM perform_with
      JOIN backbeatuser
        ON performer_1_id = backbeatuser.id
      WHERE performer_2_id = $1 AND confirmed = $2
      ORDER BY last_name ASC
  `;
  const params = [req.session.user.id, false];
  ClientHelper.connect(req, res, sql, params, client);
})

router.get('/api/performers/findmatch/:performerid', authRequired, (req, res) => {
  const sql = `
    SELECT * FROM perform_with
      WHERE (performer_1_id = $1 AND performer_2_id = $2)
      OR (performer_1_id = $2 AND performer_2_id = $1)
  `;
  const params = [req.session.user.id, req.params.performerid];
  const client = new Client();
  ClientHelper.connect(req, res, sql, params, client);
})

router.get('/api/performers/mutual/:userid', authRequired, (req, res) => {
  const client = new Client();
  client.connect().then(() => {
    const sql = `SELECT performer_2_id FROM perform_with
      WHERE performer_1_id = $1 AND confirmed = $2
    `;
    const params = [req.params.userid, true];
    return client.query(sql, params);
  }).then((results) => {
    const newClient = new Client();

    newClient.connect().then(() => {
      const newSql = `
      SELECT performer_1_id FROM perform_with
        WHERE performer_2_id = $1 AND confirmed = $2
      `;
      const newParams = [req.params.userid, true];
      return newClient.query(newSql, newParams);
    }).then((newResults) => {
      console.log('results', results);
      console.log('newResults', newResults);
      console.log('userid', req.params.userid);
      res.json({results, newResults});
    })
  })

})

router.get('/api/performers/:status', authRequired, (req, res) => {
  const status = req.params.status === 'approved' ? true : false;
  const client = new Client();
  const sql = `
  SELECT * FROM perform_with
    JOIN backbeatuser
      ON performer_1_id = backbeatuser.id
        OR performer_2_id = backbeatuser.id
    WHERE (
      (performer_1_id = $1 OR performer_2_id = $1)
      AND backbeatuser.id != $1)
      AND confirmed = $2
      ORDER BY last_name ASC
  `;
  const params = [req.session.user.id, status];
  ClientHelper.connect(req, res, sql, params, client);
})

router.put('/api/performers/approve', authRequired, (req, res) => {
  const client = new Client();
  const sql = `
    UPDATE perform_with
      SET confirmed = $1
      WHERE performer_1_id = $2 AND performer_2_id = $3
  `;
  const params = [true, req.body.performerid, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
})

router.delete('/api/performers/reject', authRequired, (req, res) => {
  const client = new Client();
  const sql = `
    DELETE FROM perform_with
      WHERE performer_1_id = $1 AND performer_2_id = $2
  `;
  const params = [req.body.performerid, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
})

router.delete('/api/performers/remove', authRequired, (req, res) => {
  console.log('removing performer', req.body);
  const client = new Client();
  const sql = `
    DELETE FROM perform_with
      WHERE (performer_1_id = $1 AND performer_2_id = $2)
      OR (performer_1_id = $2 AND performer_2_id = $1)
  `;
  const params = [req.body.performerid, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
});

module.exports = router;