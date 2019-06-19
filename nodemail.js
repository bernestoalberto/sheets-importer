const nodemailer = require('nodemailer');

const config =require('./.config/config.json');
let transporter = nodemailer.createTransport({
    host:"smtp.gmail.com",
    port: 465,
    auth: {
        user: config.nodemail.user,
        pass: config.nodemail.pass
    }
});
module.exports = {
    sendMail: function (options, user) {
        'use strict';
        transporter.sendMail(options, function (err, info) {
            if (err) {return console.log(err);}
            console.log(`${user} message %s sent: %s `, info.messageId, info.response);
        });
    }
};
