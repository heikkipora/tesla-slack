var TESLA_CREDENTIALS = {email: process.env.TESLA_USERNAME, password: process.env.TESLA_PASSWORD };
var Bacon = require('baconjs').Bacon,
    teslams = require('teslams');

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
    return 'Speed: ' + speed + 'km/h\nPosition: http://google.fi/maps/place/' + state.latitude + ',' + state.longitude;
}

function mapVehicleResponse(state) {
    return 'Firmware version: ' + state.car_version + '\nLocked: ' + (state.locked ? 'yes' : 'no');
}

exports.chargeState = function () {
    return fetchVehicleId().flatMap(fetchChargeState).map(mapChargeResponse);
};

exports.driveState = function () {
    return fetchVehicleId().flatMap(fetchDriveState).map(mapDriveResponse);
};

exports.vehicleState = function () {
    return fetchVehicleId().flatMap(fetchVehicleState).map(mapVehicleResponse);
};