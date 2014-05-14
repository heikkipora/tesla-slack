var SLACK_BOT_NAME = process.env.SLACK_BOT_NAME || 'Tesla Model S';

var express = require('express'),
    tesla = require('./tesla');

var app = express();
app.use(require('body-parser')());
app.use(require('logfmt').requestLogger());

function sendJson(res) {
    return function (message) {
        res.json(message);
    };
}

function toSlackMessage(text) {
    return {
        text: text,
        username: SLACK_BOT_NAME
    };
}

function hasCommand(req, name) {
    return req.body.text.indexOf(name) >= 0;
}

app.post('/slack', function (req, res) {
    if (req.body.token === process.env.SLACK_RECEIVE_TOKEN) {
        if (hasCommand(req, 'battery')) {
            tesla.chargeState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'position')) {
            tesla.driveState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'vehicle')) {
            tesla.vehicleState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'honk')) {
            res.json(toSlackMessage(':trumpet: TÖÖÖÖÖT-TÖÖÖÖÖÖÖÖÖÖÖT!'));
        } else {
            res.json(toSlackMessage('Supported commands: battery, honk, position, vehicle'));
        }
    } else {
        res.send(403);
    }
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});