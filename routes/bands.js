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

router.post('/band/create', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    INSERT INTO band
      (band_name, band_genre, band_skill_level, band_city, band_admin_id, band_description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
  `;
  const params = [req.body.bandName, req.body.bandGenre, req.body.bandLevel, req.body.bandCity, req.session.user.id, req.body.bandDescription];
  ClientHelper.connect(req, res, sql, params, client);
});

router.put('/band/edit/:bandId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    UPDATE band
      SET
        band_name = $1,
        band_genre = $2,
        band_skill_level = $3,
        band_city = $4,
        band_description = $5
      WHERE band_id = $6
      RETURNING *
  `;
  const params = [req.body.bandName, req.body.bandGenre, req.body.bandLevel, req.body.bandCity, req.body.bandDescription, req.params.bandId];
  ClientHelper.connect(req, res, sql, params, client);
})

router.post('/editband/:bandId/addmember/:memberId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    INSERT INTO band_user
      (band_id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `;
  const params = [req.params.bandId, req.params.memberId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.delete('/editband/:bandId/removemember/:memberId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    DELETE FROM band_user
      WHERE band_id = $1 AND user_id = $2
      RETURNING *
    `;
  const params = [req.params.bandId, req.params.memberId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.put('/editband/:bandId/addmember/:memberId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    UPDATE band_user
      SET
        band_id = $1,
        user_id = $2
      RETURNING *
    `;
  const params = [req.params.bandId, req.params.memberId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.post('/editband/:bandId/addinstrument/:instrumentId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
        INSERT INTO band_instruments
            (band_id, instrument_id)
            VALUES ($1, $2)
            RETURNING *
    `;
  const params = [req.params.bandId, req.params.instrumentId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.delete('/editband/:bandId/removeinstrument/all', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
  DELETE FROM band_instruments
  WHERE band_id = $1
  `;
  const params = [req.body.bandId];

  ClientHelper.connect(req, res, sql, params, client);
})

router.delete('/editband/:bandId/removeinstrument/:instrumentId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    DELETE FROM band_instruments
      WHERE band_id = $1 AND instrument_id = $2
      RETURNING *
    `;
  const params = [req.params.bandId, req.params.instrumentId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.delete('/band/delete/:bandId', authRequired, (req, res) => {
  const client = new Client(dbConfig);

  client.connect().then(() => {
    const sql = `
      DELETE FROM band
        WHERE band_id = $1
        RETURNING *
    `;

    const params = [req.params.bandId];

    return client.query(sql, params);
  }).then(() => {
    sql = `
      DELETE FROM band_user
        WHERE band_id = $1
        RETURNING *
    `;

    params = [req.params.bandId];

    return client.query(sql, params);
  }).then((results) => {
    res.json(results);
  }).catch((err) => {
    throw err;
  }).then(() => {
    client.end();
  })
})

router.get('/api/band/:bandId/instruments', authRequired, (req, res) => {
    const client = new Client(dbConfig);
    const sql = `
        SELECT * FROM band_instruments
            JOIN instrument
                ON band_instruments.instrument_id = instrument.instrument_id
            WHERE band_id = $1
            ORDER BY name
    `;
    const params = [req.params.bandId];
    ClientHelper.connect(req, res, sql, params, client);
})

router.get('/api/band/:bandId', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
  SELECT *
    FROM band
    JOIN band_user ON band.band_ID = band_user.band_id
    JOIN backbeatuser ON band_user.user_id = backbeatuser.id
    WHERE band.band_id = $1
  `;
  const params = [req.params.bandId];
  ClientHelper.connect(req, res, sql, params, client);
});

router.get('/api/band/:bandId/messages', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT * FROM band_messages
      JOIN backbeatuser ON band_messages.sender_id = backbeatuser.id
      WHERE band_id = $1
      ORDER BY created_at ASC
  `;
  const params = [req.params.bandId];
  console.log('GETTING MESSAGES', sql, params);
  ClientHelper.connect(req, res, sql, params, client);
})

router.post('/band/upload/pdf/:bandid', authRequired, (req, res) => {
  console.log('hello from this post route', req.body);

  const pdf = req.body.pdf.split(';base64,').pop();

  fs.writeFile(`uploads/band_chart.pdf`, req.body.pdf, 'binary', (err) => {
    if (err) {
      console.log('error', err);
    } else {
      console.log('the file was saved');
    }
  });

  // TODO: be sure to prevent overwriting the url if a band admin uses a duplicate chart title

  cloudinary.uploader.upload('uploads/band_chart.pdf', function (result) {
    console.log('results', result);
    const client = new Client(dbConfig);
    const sql = `
        INSERT INTO band_charts
            (band_id, chart_title, url, instrument_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
    `;
    const params = [req.params.bandid, req.body.title, result.secure_url, req.body.instrument_id];
    ClientHelper.connect(req, res, sql, params, client);
  },
    { public_id: `band/${req.params.bandid}/${req.body.title}/instrument/${req.body.instrument_id}` })
});

router.get('/api/band/charts/pdf/:bandid', authRequired, (req, res) => {
    console.log('GETTING BAND CHARTS=======================================================================================================================================================');
    // TODO: add code to check that logged in user is a member of this band
    const client = new Client(dbConfig);
    const sql = `
        SELECT * FROM band_charts
            WHERE band_id = $1
    `;
    const params = [req.params.bandid];
    ClientHelper.connect(req, res, sql, params, client);
});

router.put('/api/band/member/instrument/edit', authRequired, (req, res) => {
    console.log('UPDATE INSTRUMENT ROUTE RUNNING', req.body);
    const client = new Client(dbConfig);
    const sql = `
    UPDATE band_user
        SET instrument_id = $1
        WHERE band_id = $2 AND user_id = $3
        RETURNING *
    `;
    const params = [req.body.instrumentId, req.body.bandId, req.body.memberId];
    ClientHelper.connect(req, res, sql, params, client);
})

router.post('/api/band/message/new', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    INSERT INTO band_messages
      (band_id, created_at, content, sender_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
  `;
  const params = [req.body.bandId, req.body.date, req.body.message, req.body.senderId];
  ClientHelper.connect(req, res, sql, params, client);
});

module.exports = router;
