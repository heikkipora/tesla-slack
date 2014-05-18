var TESLA_CREDENTIALS = {email: process.env.TESLA_USERNAME, password: process.env.TESLA_PASSWORD };
var Bacon = require('baconjs').Bacon,
    teslams = require('teslams'),
    _ = require('lodash'),
    geolib = require('geolib'),
    knownPlaces = require('./known-places');

function milesToKm(value) {
    return value * 1.60934;
}

function toHoursAndMinutes(value) {
    var hours = Math.floor(value);
    var minutes = Math.round((value - hours) * 60);
    if (hours > 0) {
        return hours + ' h' + minutes + ' min';
    } else {
        return minutes + ' min';
    }

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

function fetchClimateState(vehicleId) {
    return Bacon.fromCallback(teslams.get_climate_state, vehicleId);
}

function mapRange(state) {
    var estimatedRange = milesToKm(state.est_battery_range).toFixed(0);
    var idealRange = milesToKm(state.ideal_battery_range).toFixed(0);
    return 'Current range is ' + estimatedRange + '-' + idealRange + ' km';
}

function mapChargeResponse(state) {
    switch (state.charging_state) {
        case 'Charging':
            var timeToFull = toHoursAndMinutes(state.time_to_full_charge);
            return 'Charging at ' + state.charger_power + ' kW, complete in ' + timeToFull + '. ' + mapRange(state);
        case 'Complete':
            return 'Fully charged. ' + mapRange(state);
        default:
            return 'Disconnected. ' + mapRange(state);
    }
}

function mapDriveResponse(state) {
    var speed = milesToKm(state.speed || 0).toFixed(0);
    var speedTxt = 'Speed: ' + speed + 'km/h\n';
    var locationTxt = 'Position: unknown';
    if (state.latitude && state.longitude) {
        var inKnownPlace = isInAlreadyKnownPlace(state.latitude, state.longitude);
        var position = state.latitude + ',' + state.longitude
        var googleMapsUrl = 'http://maps.googleapis.com/maps/api/staticmap?center=' + position + '&markers=' + position + '&size=600x300&zoom=12'
        locationTxt = 'Position: ' + (inKnownPlace ? inKnownPlace.name + ' @ ': '' ) + googleMapsUrl;
    }
    return speedTxt + locationTxt;
}

function isInAlreadyKnownPlace(latitude, longitude) {
    return _.find(knownPlaces, function(place) {
      var distance = geolib.getDistance({latitude: latitude, longitude: longitude}, place);
      return distance < place.radius;
    });
}
function mapVehicleResponse(state) {
    return 'Firmware version: ' + state.car_version + '\nLocked: ' + (state.locked ? 'yes' : 'no');
}

function mapClimateResponse(state) {
    var internalTemp = feelsLike(state.inside_temp) + ' (' + state.inside_temp + 'C)';
    var externalTemp = feelsLike(state.outside_temp) + ' (' + state.outside_temp + 'C)';
    return 'Inside: ' + internalTemp +'\nOutside: ' + externalTemp;
}

function feelsLike(temp) {
    if (temp <= -20) {
        return "HORRIBLY COLD NUCLEAR WINTER WEATHER";
    } else if (temp <= -10) {
        return "darn cold";
    } else if (temp <= 0) {
        return "quite crispy";
    } else if (temp <= 10) {
        return "a bit nippy";
    } else if (temp <= 20) {
        return "cool and mellow";
    } else if (temp <= 25) {
        return "nice and balmy";
    } else if (temp <= 30) {
        return "warm and toasty";
    } else {
        return "hot and sweaty";
    }
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

exports.climateState = function () {
    return fetchVehicleId().flatMap(fetchClimateState).map(mapClimateResponse);
};