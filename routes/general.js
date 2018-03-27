const router = require('express').Router();
const { Client } = require('pg');
const fs = require('fs');

const ClientHelper = require('./client_helper');
const RoutesHelper = require('./routes_helper');
const authRequired = RoutesHelper.authRequired;
const Mailer = require('./mail_helper');

const cloudinary = require('cloudinary');
const nodemailer = require('nodemailer');
const moment = require('moment');
const jwt = require('jsonwebtoken');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const emailHeader = Mailer.generateHeader();
const emailFooter = Mailer.generateFooter();

const User = require('../models/user');

let transporter = nodemailer.createTransport(Mailer.transport);

router.get('/backbeat', (req, res) => {
    const token = jwt.sign({ foo: 'bar' }, 'secret');
    req.session.token = token;
    req.session.user = req.user;
    console.log('session', req.session);
    res.status(200).json({
        userid: req.user.id,
        token
    });
})

router.post('/api/activate', (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET is_active = $1
        WHERE username = $2 AND activation_key = $3
        RETURNING *
        `;

        const params = [true, req.body.username, req.body.activationKey];

        return client.query(sql, params);
    }).then((response) => {
        console.log('RESPONSE', response.rows);
        res.json(response);
    })
});

router.get('/myprofile/:userid', authRequired, (req, res) => {
    console.log('MY PROFILE ROUTE IS RUNNING====================================')
    const client = new Client();

    client.connect().then(() => {
        const sql = `SELECT * FROM backbeatuser WHERE id = $1`;
        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.header('Cache-Control', 'no-store').type('json').status(200).json(results);
    }).catch((err) => {
        console.log('ERROR', err);
        throw err;
    }).then(() => {
        client.end();
    })
})

router.put('/myprofile/update', authRequired, (req, res) => {
    const client = new Client();
    const userInfo = req.body.userInfo;

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET first_name = $1, last_name = $2, email = $3, bio = $4, skill_level = $5
        WHERE id = $6
        RETURNING *
        `;

        const params = [userInfo.firstName, userInfo.lastName, userInfo.email, userInfo.bio, userInfo.skillLevel, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        console.log(err);
    }).then(() => {
        client.end();
    })
})

router.put('/user/onboarding/plus', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET onboarding_stage = onboarding_stage + 1
        WHERE id = $1
        RETURNING *
        `;

        const params = [req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/username/:username', (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT username FROM backbeatuser WHERE username = $1
        `;

        const params = [req.params.username];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results.rows);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/user/id/:userid', (req, res) => {

  console.log('GETTING USER THIS TIME', req.params);

    const client = new Client();

    client.connect().then(() => {
        const sql = `
          SELECT * FROM backbeatuser WHERE id = $1
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results.rows);
    }).catch((err) => {
      console.log('SET USER ERROR', err);
    }).then(() => {
        client.end();
    })
})

router.get('/api/usernames/all', (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT username FROM backbeatuser
        `;

        return client.query(sql);
    }).then((results) => {
        res.json(results.rows);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/instruments/all', (req, res) => {
    const client = new Client();
    const sql = `
        SELECT * FROM instrument
    `;
    const params = [];
    ClientHelper.connect(req, res, sql, params, client);
})

router.get('/api/profile/:username', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT id, first_name, last_name, username, city, skill_level, onboarding_stage, has_profile_photo, profile_photo_version, profile_image_url
        FROM backbeatuser
        WHERE username = $1`;

        const params = [req.params.username];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results.rows[0])
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/bands/user/:userid', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT *
        FROM backbeatuser
        JOIN band_user ON band_user.user_id = backbeatuser.id
        JOIN band ON band_user.band_id = band.band_id
        WHERE backbeatuser.id = $1
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.get('/api/user/styles', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM style_user
        WHERE user_id = $1
        `;

        const params = [req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/users/styleidone/:styleidone/styleidtwo/:styleidtwo/styleidthree/:styleidthree/city/:city/skill_level_one/:skill_level_one/skill_level_two/:skill_level_two/skill_level_three/:skill_level_three', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
            SELECT DISTINCT ON (user_id)
                * FROM style_user
                    JOIN backbeatuser ON style_user.user_id = backbeatuser.id
                    WHERE (backbeatuser.city = $1
                        AND (style_user.style_id = $2
                            OR style_user.style_id = $3
                            OR style_user.style_id = $4))
                            AND (style_user.user_id != $5)
                            AND (backbeatuser.skill_level = $6
                                OR backbeatuser.skill_level = $7
                                OR backbeatuser.skill_level = $8)
        `;

        const params = [req.params.city, req.params.styleidone, req.params.styleidtwo, req.params.styleidthree, req.session.user.id, req.params.skill_level_one, req.params.skill_level_two, req.params.skill_level_three];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/users/city/:city/skill_level_one/:skill_level_one/skill_level_two/:skill_level_two/skill_level_three/:skill_level_three', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM backbeatuser
            WHERE (city = $1 AND id != $2)
            AND (skill_level = $3 OR skill_level = $4 OR skill_level = $5)
            ORDER BY random()
            LIMIT 25
        `;

        const params = [req.params.city, req.session.user.id, req.params.skill_level_one, req.params.skill_level_two, req.params.skill_level_three];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/users/instrumentid/:instrument/city/:city/skilllevel/:skillLevel/', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM backbeatuser
        JOIN instrument_user ON backbeatuser.id = instrument_user.user_id
        JOIN instrument ON instrument_user.instrument_id = instrument.instrument_id
        WHERE (backbeatuser.city = $1 AND skill_level = $2)
        AND instrument.instrument_id = $3
        `;

        const params = [req.params.city, req.params.skillLevel, req.params.instrument];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/user/:id', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM backbeatuser WHERE id = $1
        `;

        const params = [req.params.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results.rows[0])
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/users', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM backbeatuser WHERE id != $1
        `;

        const params = [req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results.rows);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })

});

router.post('/upload', authRequired, (req, res) => {

    cloudinary.uploader.upload(req.body.image, function(result) {
        console.log(result)
        const client = new Client();

        client.connect().then(() => {

            const sql = `
            UPDATE backbeatuser
            SET profile_image_url = $1
            WHERE id = $2
            `;

            const params = [result.secure_url, req.session.user.id];

            return client.query(sql, params);

        }).then((results) => {
            res.json(results);
        }).catch((err) => {
            console.log('error', err);
        }).then(() => {
            client.end();
        })
    }, { public_id: `profile_image_${req.session.user.id}` });

});

router.get('/api/user/image/:userid', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT profile_image_url
        FROM backbeatuser
        WHERE id = $1
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        console.log('error', err);
    }).then(() => {
        client.end();
    })

})

router.post('/uploaddefault', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET profile_image_url = $1
        WHERE id = $2
        `;

        const params = [process.env.DEFAULT_PROFILE_IMAGE, req.session.user.id];

        return client.query(sql, params);
    }).then((response) => {
        res.json(response);
    }).catch((err) => {
        console.log(err);
    }).then(() => {
        client.end();
    });

});

router.post('/api/user/vids', authRequired, (req, res) => {

    console.log('ADD VIDEOS', req.body);

    // if (req.body.video_description === undefined) {
    //   req.body.video_description === null;
    // }

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO video
        (user_id, youtube_id, set_as_primary)
        VALUES ($1, $2, $3)
        RETURNING *
        `;

        const params = [req.session.user.id, req.body.item.youtube_id, req.body.item.set_as_primary];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/user/vids/:userid', authRequired, (req, res) => {

    console.log('getting user vids', req.session);

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM video
        WHERE user_id = $1
        ORDER BY set_as_primary DESC
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.post('/api/user/vidprimary/:videoid', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET primary_vid_id = $1
        WHERE id = $2
        RETURNING *
        `;

        const params = [req.params.videoid, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })

});

router.get('/api/user/vidprimary/:userid', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM video
        WHERE user_id = $1
        ORDER BY set_as_primary DESC
        LIMIT 1
        `;

        const params = [req.params.userid];
        console.log('GETTING PRIMARY VIDEO', params);

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.delete('/api/user/tracks', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        DELETE FROM track
        WHERE user_id = $1
        `;

        const params = [req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        console.log('error', err);
    }).then(() => {
        client.end();
    })
})

router.delete('/api/user/vids', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        DELETE FROM video
        WHERE user_id = $1
        `;

        const params = [req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        console.log('error', err);
    }).then(() => {
        client.end();
    })
})

router.post('/api/user/tracks', authRequired, (req, res) => {

    console.log('ADD TRACKS', req.body);

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO track
        (user_id, track_url, set_as_primary)
        VALUES ($1, $2, $3)
        RETURNING *
        `;

        const params = [req.session.user.id, req.body.item.track_url, req.body.item.set_as_primary];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    });
});

router.put('/api/user/trackprimary/', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        UPDATE backbeatuser
        SET primary_track_url = $1
        WHERE id = $2
        RETURNING *
        `;

        const params = [req.body.track_url, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })

});

router.get('/api/user/tracks/:userid', authRequired, (req, res) => {

    console.log('getting user tracks for ', req.params.userid);

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM track
        WHERE user_id = $1
        ORDER BY set_as_primary DESC
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/user/trackprimary/:userid', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM track
        WHERE user_id = $1
        ORDER BY set_as_primary DESC
        LIMIT 1
        `;

        const params = [req.params.userid];
        console.log('GETTING PRIMARY TRACK', params);

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.get('/api/events/city', authRequired, (req, res) => {

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_creator_id, event_location, event_has_occured, event_date_time, event_creator_city, event_address, event_details
        FROM events
        WHERE events.event_creator_city LIKE $1 AND NOT EXISTS
        (SELECT *
            FROM event_user
            WHERE events.event_id = event_user.event_id AND event_user.user_id = $2)
            ORDER BY events.event_date_time ASC
            `;

        const params = [`%${req.session.user.city}%`, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.post('/api/event/attendance', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO event_user
        (event_id, user_id, attending)
        VALUES ($1, $2, $3)
        RETURNING *
        `;

        const params = [req.body.eventId, req.session.user.id, req.body.attending];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/events/attending/:userid', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM event_user
        WHERE user_id = $1
        AND attending = $2
        `;

        const params = [req.params.userid, true];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.post('/api/addsong', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO newsfeed
        (type, verb, noun, user_id, user_username, user_first_name, user_last_name, artist_link, artist_name, song_url, mp3_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `;

        const params = ['status', 'is listening to', req.body.trackName, req.session.user.id, req.session.user.username, req.session.user.first_name, req.session.user.last_name, req.body.artistViewUrl, req.body.artistName, req.body.trackViewUrl, req.body.previewUrl];

        console.log('PARAMS', params);

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/getnews', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM newsfeed
        ORDER BY id DESC
        LIMIT 100
        `;

        return client.query(sql);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

// TODO: Add the ability to create events for the Newsfeed component, including people attending events, concerts and jam sessions being created, users joining, etc.

router.get('/api/event/:id/details/', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_creator_id, event_location, event_has_occured, event_date_time, event_creator_city, event_address, event_details
        FROM events
        WHERE event_id = $1
        `;

        const params = [req.params.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/searchbands/:band', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM band
        WHERE band_name ILIKE $1
        `;

        let searchVal = `%${req.params.band}%`;

        const params = [searchVal];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/searchusernames/:username', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM backbeatuser
        WHERE ((first_name ILIKE $1 OR last_name ILIKE $1) OR first_name || ' ' || last_name ILIKE $1)
        AND id != $2
        LIMIT 15
        `;

        // the '%string%' syntax is required in this case
        let searchVal = `%${req.params.username}%`

        const params = [searchVal, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

// TODO: filter instruments that already exist in a band's instrumentation
router.get('/api/searchinstruments/:instrumentname', authRequired, (req, res) => {
    const client = new Client();
    const sql = `
        SELECT * FROM instrument
            WHERE name ILIKE $1
    `;
    const searchTerm = `%${req.params.instrumentname}%`;
    const params = [searchTerm];
    ClientHelper.connect(req, res, sql, params, client);
})

router.post('/api/calendar/add', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO events
        (event_title, event_details, event_type, event_creator_id, event_location, event_has_occured, event_date_time, event_creator_city, event_address, event_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, %10)
        RETURNING *
        `;

        const params = [req.body.eventTitle, req.body.eventDetails, req.body.eventType, req.session.user.id, req.body.eventVenue, false, req.body.eventDateTime, req.body.userCity, req.body.eventAddress, req.body.eventEnd];

        console.log('PARAMS', params);

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/my_band_events/:type/:limit', authRequired, (req, res) => {

    const limit = req.params.limit === 'nolimit' ? null : req.params.limit;

    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_location, event_date_time, event_address, gig_reh.band_id, event_details
        FROM gig_reh
        JOIN band_user ON band_user.band_id = gig_reh.band_id
        WHERE band_user.user_id = $1 AND gig_reh.event_type = $2
        ORDER BY gig_reh.event_date_time ASC
        LIMIT $3
        `;

        const params = [req.session.user.id, req.params.type, limit];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/event/:eventId', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_creator_id, event_location, event_has_occured, event_date_time, event_creator_city, event_address, event_details
        FROM events
        WHERE event_creator_city = $1
        `;

        const params = [req.params.eventId];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/band_event/:eventId/details', authRequired, (req, res) => {
    const client = new Client();

    console.log('EVENT ID', req.params.eventId);

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_location, event_date_time, event_address, gig_reh.band_id, event_details
        FROM gig_reh
        JOIN band ON gig_reh.band_id = band.band_id
        WHERE event_id = $1
        `;

        const params = [req.params.eventId];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/gig/band/:bandid', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT event_id, event_title, event_type, event_location, event_date_time, event_address, band_id, event_details, event_end
        FROM gig_reh
        WHERE band_id = $1
        `;

        const params = [req.params.bandid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.post('/api/gig/band/:bandid', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO gig_reh
        (event_type, event_title, event_date_time, event_location, event_details, band_id, event_address, event_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `;

        const params = [req.body.eventType, req.body.eventTitle, req.body.eventDateTime, req.body.eventVenue, req.body.eventDetails, req.params.bandid, req.body.eventAddress, req.body.eventEnd];

        console.log('PARAMS', params);

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/genres', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM style
        ORDER BY style_name
        `;

        return client.query(sql);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.post('/api/genres/add', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO style_user
        (style_id, user_id)
        VALUES ($1, $2)
        RETURNING *
        `;

        const params = [req.body.item.id, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })


})

router.get('/api/instruments', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM instrument
        ORDER BY name
        `;

        return client.query(sql);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

router.get('/api/instrumentuser/:userid', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        SELECT * FROM instrument_user
        JOIN instrument
        ON instrument_user.instrument_id = instrument.instrument_id
        WHERE user_id = $1
        ORDER BY instrument.name
        `;

        const params = [req.params.userid];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
})

router.get('/api/instrumentbyid/:id', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = ``
    })
})

router.post('/api/instruments/add', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO instrument_user
        (instrument_id, user_id)
        VALUES ($1, $2)
        RETURNING *
        `;

        const params = [req.body.item.id, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })


});

router.post('/api/instruments_seeking/add', authRequired, (req, res) => {
    const client = new Client();

    client.connect().then(() => {
        const sql = `
        INSERT INTO instrument_seeking
        (instrument_id, user_id)
        VALUES ($1, $2)
        RETURNING *
        `;

        const params = [req.body.item.id, req.session.user.id];

        return client.query(sql, params);
    }).then((results) => {
        res.json(results);
    }).catch((err) => {
        throw err;
    }).then(() => {
        client.end();
    })
});

module.exports = router;
