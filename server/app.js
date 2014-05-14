var SLACK_BOT_NAME = process.env.SLACK_BOT_NAME || 'Tesla Model S';
var TESLA_CREDENTIALS = {email: process.env.TESLA_USERNAME, password: process.env.TESLA_PASSWORD };

var Bacon = require('baconjs').Bacon,
    express = require('express'),
    teslams = require('teslams');

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
    var estimatedRange = milesToKm(state.est_battery_range).toFixed(1);
    var idealRange = milesToKm(state.ideal_battery_range).toFixed(1);
    return 'Charging state: ' + state.charging_state + '\nBattery level: ' + state.battery_level + '%\nEstimated range: ' + estimatedRange + 'km\nIdeal range: ' + idealRange + 'km';
}

function mapDriveResponse(state) {
    var speed = milesToKm(state.speed || 0).toFixed(0);
    var position = state.latitude + ',' + state.longitude
    return 'Speed: ' + speed + 'km/h\nPosition: http://maps.googleapis.com/maps/api/staticmap?center=' + position + '&markers=' + position + '&size=600x300&zoom=12';
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
        if (hasCommand(req, 'battery')) {
            chargeState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'position')) {
            driveState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'vehicle')) {
            vehicleState().map(toSlackMessage).onValue(sendJson(res));
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