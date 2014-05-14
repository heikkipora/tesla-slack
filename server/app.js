var SLACK_BOT_NAME = process.env.SLACK_BOT_NAME || 'Tesla Model S';
var TESLA_CREDENTIALS = {email: process.env.TESLA_USERNAME, password: process.env.TESLA_PASSWORD };
var env = process.env.NODE_ENV || 'dev';

var Bacon = require('baconjs').Bacon,
    express = require('express'),
    teslams = require('teslams'),
    Slack = require('node-slack');

var app = express();
app.use(require('body-parser')());
app.use(require('logfmt').requestLogger());

var slack = new Slack(process.env.SLACK_DOMAIN, process.env.SLACK_SEND_TOKEN);

function sendToSlack(text, channel) {
    if (env === 'dev') {
        console.log(text);
    } else {
        slack.send({
            text: text,
            channel: '#' + channel,
            username: SLACK_BOT_NAME
        });
    }
}

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

function milesToKm(value) {
    return value * 1.60934;
}

function fetchVehicleId() {
    return Bacon.fromCallback(teslams.get_vid, TESLA_CREDENTIALS);
}

function fetchChargeState(vehicleId) {
    return Bacon.fromCallback(teslams.get_charge_state, vehicleId);
}

function fetchDriveState(vehicleId) {
    return Bacon.fromCallback(teslams.get_drive_state, vehicleId);
}

function fetchVehicleState(vehicleId) {
    return Bacon.fromCallback(teslams.get_vehicle_state, vehicleId);
}

function mapChargeResponse(state) {
    var rangeInKm = milesToKm(state.est_battery_range).toFixed(1);
    return 'Charging state: ' + state.charging_state + '\nBattery level: ' + state.battery_level + '%\nEstimated range: ' + rangeInKm + 'km';
}

function mapDriveResponse(state) {
    var speed = milesToKm(state.speed || 0).toFixed(0);
    return 'Speed: ' + speed + 'km/h\nPosition: http://google.fi/maps/place/' + state.latitude + ',' + state.longitude;
}

function mapVehicleResponse(state) {
    return 'Firmware version: ' + state.car_version + '\nLocked: ' + (state.locked ? 'yes' : 'no');
}

function chargeState() {
    return fetchVehicleId().flatMap(fetchChargeState).map(mapChargeResponse);
}

function driveState() {
    return fetchVehicleId().flatMap(fetchDriveState).map(mapDriveResponse);
}

function vehicleState() {
    return fetchVehicleId().flatMap(fetchVehicleState).map(mapVehicleResponse);
}

app.post('/slack', function (req, res) {
    if (req.body.token === process.env.SLACK_RECEIVE_TOKEN) {
        if (req.body.text.indexOf('battery') >= 0) {
            sendToSlack('Fetching battery state, please wait...', req.body.channel_name);
            chargeState().map(toSlackMessage).onValue(sendJson(res));
        } else if (req.body.text.indexOf('drive') >= 0) {
            sendToSlack('Fetching drive state, please wait...', req.body.channel_name);
            driveState().map(toSlackMessage).onValue(sendJson(res));
        } else if (req.body.text.indexOf('vehicle') >= 0) {
            sendToSlack('Fetching vehicle state, please wait...', req.body.channel_name);
            vehicleState().map(toSlackMessage).onValue(sendJson(res));
        } else {
            res.json(toSlackMessage('Supported commands: battery, drive, vehicle'));
        }
    } else {
        res.send(403);
    }
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});