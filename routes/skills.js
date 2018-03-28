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

router.get('/api/skills', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `SELECT * FROM skills`;
  const params = null;
  ClientHelper.connect(req, res, sql, params, client);
});

router.post('/api/skills', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    INSERT INTO skill_user
      (skill_id, user_id)
      VALUES ($1, $2)
  `;
  const params = [req.body.skill.skill_id, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
});

router.delete('/api/skills', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    DELETE FROM skill_user
      WHERE user_id = $1
  `;
  const params = [req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
})

router.get('/api/skills/show/:userid', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT * FROM skill_user
      JOIN skills ON skills.skill_id = skill_user.skill_id
      WHERE skill_user.user_id = $1
  `;
  const params = [req.params.userid];
  ClientHelper.connect(req, res, sql, params, client);
});

router.post('/api/skills/endorse', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    INSERT INTO endorsements
      (skill_id, user_id, endorser_id)
      VALUES ($1, $2, $3)
      RETURNING *
  `;
  const params = [req.body.skill_id, req.body.user_id, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
});

router.delete('/api/skills/endorse', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    DELETE FROM endorsements
      WHERE (skill_id = $1 AND user_id = $2) AND endorser_id = $3
      RETURNING *
  `;
  const params = [req.body.skill_id, req.body.user_id, req.session.user.id];
  ClientHelper.connect(req, res, sql, params, client);
});

router.get('/api/skills/endorsements/:userid', authRequired, (req, res) => {
  const client = new Client(dbConfig);
  const sql = `
    SELECT * FROM endorsements
	    WHERE user_id = $1
  `;
  const params = [req.params.userid];
  ClientHelper.connect(req, res, sql, params, client);
});

module.exports = router;