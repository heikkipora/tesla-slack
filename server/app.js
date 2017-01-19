var SLACK_BOT_NAME = process.env.SLACK_BOT_NAME || 'Tesla Model S';

var env = process.env.NODE_ENV || 'dev';
if (env === 'production') {
    require('newrelic');
}

var express = require('express'),
    tesla = require('./tesla'),
    Bacon = require('baconjs').Bacon,
    bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
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

function errorText(error) {
    return JSON.stringify(error)
}

app.post('/slack', function (req, res) {
    if (req.body.token === process.env.SLACK_RECEIVE_TOKEN) {
        var command = req.body.text.trim()
        console.log('Command: ' + command)
        var name = 'tessi'
        if (command === 'battery') {
            tesla.chargeState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res));
        } else if (command === 'climate') {
            tesla.climateState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res));
        } else if (command === 'position') {
            tesla.formattedDriveState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res));
        } else if (command === 'vehicle') {
            tesla.vehicleState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res));
        } else {
            res.json(toSlackMessage('Supported commands: battery, climate, position, vehicle.'))
        }
    } else {
        res.sendStatus(403);
    }
});

app.get('/', function (req,res) {
    res.send('ok'); // used for newrelic monitoring at Heroku
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});
