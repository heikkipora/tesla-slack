const _ = require('lodash')
const geolib = require('geolib')
const knownPlaces = require('./known-places')
const Tesla = require('tesla-api')

function listVehicles(email, password) {
  return Tesla.login({email, password, distanceUnit: 'km'})
}

async function vehicleWakeUp(vehicle) {
  await vehicle.wakeUp()
}

async function vehicleInfo(vehicle, googleApiKey) {
  const battery = await vehicleBattery(vehicle)
  const speedAndLocation = await vehicleSpeedAndLocation(vehicle, googleApiKey)
  return battery.concat(speedAndLocation)
}

async function vehicleSpeedAndLocation(vehicle, googleApiKey) {
  const state = await vehicle.driveState()
  return [`Speed: ${state.speed || 0} km/h`,
          `Location: ${location(state, googleApiKey)}`]
}

async function vehicleBattery(vehicle) {
  const state = await vehicle.chargeState()
  const range = `Current range is ${state.estBatteryRange}-${state.idealBatteryRange} km.`
  switch (state.chargingState) {
    case 'Charging': {
      const timeToFull = toHoursAndMinutes(state.timeToFullCharge)
      return [`Charging at ${state.chargerPower} kW, complete in ${timeToFull}. ${range}`]
    }
    case 'Complete':
      return [`Fully charged. ${range}`]
    default:
      return [`Disconnected. ${range}`]
  }
}

function toHoursAndMinutes(value) {
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  let msg = ''

  if (hours > 0) {
    msg = hours + ' h'
  }
  if (minutes > 0) {
    msg += (hours ? ' ' : '') + minutes + ' min'
  }
  return msg
}

function location(state, googleApiKey) {
  if (state.latitude && state.longitude) {
    const inKnownPlace = isInKnownPlace(state.latitude, state.longitude)
    const position = `${state.latitude},${state.longitude}`
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/staticmap?key=${googleApiKey}&center=${position}&markers=${position}&size=600x300&zoom=12`
    return inKnownPlace ? `${inKnownPlace.name} @ ${googleMapsUrl}` : googleMapsUrl
  }
  return 'unknown'
}

function isInKnownPlace(latitude, longitude) {
  return _.find(knownPlaces, place => geolib.getDistance({latitude, longitude}, place) < place.radius)
}

module.exports = {
  listVehicles,
  vehicleInfo,
  vehicleWakeUp
}
