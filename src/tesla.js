var TESLA_CREDENTIALS = {email: process.env.TESLA_USERNAME, password: process.env.TESLA_PASSWORD };
var Bacon = require('baconjs').Bacon,
    teslams = require('teslams'),
    _ = require('lodash'),
    geolib = require('geolib'),
    knownPlaces = require('./known-places');

var cachedVehicles = [];
fetchVehicles().log()

function milesToKm(value) {
    return value * 1.60934;
}

function toHoursAndMinutes(value) {
    var hours = Math.floor(value);
    var minutes = Math.round((value - hours) * 60);
    var msg = '';

    if (hours > 0) {
        msg = hours + ' h';
    }
    if (minutes > 0) {
        msg += (hours ? ' ' : '') + minutes + ' min';
    }
    return msg;
}

function fetchVehicles() {
    if (cachedVehicles.length > 0) {
        return Bacon.later(0, cachedVehicles);
    }
    return Bacon.fromNodeCallback(function(callback) {
      teslams.all(TESLA_CREDENTIALS, function(err, response, body) {
          callback(err, body);
      })
    })
        .map(JSON.parse)
        .map('.response')
        .map(function(response) {
            return response.map(function(vehicle) {
                return { id: vehicle.id, name: vehicle.display_name.toLowerCase() };
            })
        })
        .doAction(function(vehicleIds) {
            cachedVehicles = vehicleIds;
        })
}

function nameToVehicleId(name) {
    return fetchVehicles().flatMap(function(vehicles) {
        var vehicle = _.find(vehicles, {name: name.toLowerCase()})
        if (vehicle) {
          return Bacon.once(vehicle.id)
        } else {
          return Bacon.once(new Bacon.Error('Unrecognized vehicle name: ' + name))
        }
    });
}

function fetchChargeState(vehicleId) {
    return Bacon.fromCallback(teslams.get_charge_state, vehicleId);
}

function fetchDriveState(vehicleId) {
    return Bacon.fromCallback(teslams.get_drive_state, vehicleId).flatMap(teslaErrorToBaconError(vehicleId));
}

function fetchVehicleState(vehicleId) {
    return Bacon.fromCallback(teslams.get_vehicle_state, vehicleId);
}

function fetchClimateState(vehicleId) {
    return Bacon.fromCallback(teslams.get_climate_state, vehicleId);
}

function wakeUp(vehicleId) {
  return Bacon.fromCallback(teslams.wake_up, vehicleId);
}

function teslaErrorToBaconError(vehicleId) {
  return function(teslaAPIresponse) {
    if(teslaAPIresponse instanceof Error) {
      console.log(teslaAPIresponse)
      wakeUp(vehicleId).onValue(function(apiResponse) {
        console.log("Tried to wake up vehicle: ", apiResponse);
      });
      return new Bacon.Error(teslaAPIresponse);
    }
    else return teslaAPIresponse;
  };
}

function mapRange(state) {
    var estimatedRange = milesToKm(state.est_battery_range).toFixed(0);
    var idealRange = milesToKm(state.ideal_battery_range).toFixed(0);
    return 'Current range is ' + estimatedRange + '-' + idealRange + ' km.';
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
  return  _.assign({}, state,
    {speed: Math.round(milesToKm(state.speed || 0)),
     location: [state.longitude, state.latitude],
     shift_state: state.shift_state ? state.shift_state : "P"
    });
}

function formatDriveResponse(state) {
    var speed = milesToKm(state.speed || 0).toFixed(0);
    var speedTxt = 'Speed: ' + speed + 'km/h\n';
    var locationTxt = 'Position: unknown';
    if (state.latitude && state.longitude) {
        var inKnownPlace = isInAlreadyKnownPlace(state.latitude, state.longitude);
        var position = state.latitude + ',' + state.longitude;
        var googleMapsUrl = 'http://maps.googleapis.com/maps/api/staticmap?center=' + position + '&markers=' + position + '&size=600x300&zoom=12';
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

exports.vehicleNames = function() {
    return fetchVehicles().map(function(vehicles) {
      return 'Known vehicles: ' + _.map(vehicles, 'name').join(', ')
    });
}

exports.chargeState = function(name) {
    return nameToVehicleId(name).flatMap(fetchChargeState).map(mapChargeResponse);
};

exports.driveState = function(name) {
    return nameToVehicleId(name).flatMap(fetchDriveState).map(mapDriveResponse);
};
exports.formattedDriveState = function(name) {
  return nameToVehicleId(name).flatMap(fetchDriveState).map(formatDriveResponse);
};

exports.vehicleState = function(name) {
    return nameToVehicleId(name).flatMap(fetchVehicleState).map(mapVehicleResponse);
};

exports.climateState = function(name) {
    return nameToVehicleId(name).flatMap(fetchClimateState).map(mapClimateResponse);
};
