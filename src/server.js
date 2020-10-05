const _ = require('lodash')
const bodyParser = require('body-parser')
const express = require('express')
const {listVehicles, vehicleInfo} = require('./tesla')

const app = express()
app.use(bodyParser.urlencoded({extended: false}))

app.post('/slack', async (req, res) => {
  if (req.body.token != process.env.SLACK_RECEIVE_TOKEN) {
    res.sendStatus(403)
    return
  }

  const args = req.body.text.trim().split(' ')
  const name = args.length > 1 ? args[1] : ''

  try {
    const vehicles = await listVehicles(process.env.TESLA_USERNAME, process.env.TESLA_PASSWORD)
    const vehicleNames = _.map(vehicles, 'displayName')
    const vehicle = _.find(vehicles, vehicle => vehicle.displayName.toLowerCase() == name.toLowerCase())

    if (vehicle) {
      const googleApiKey = process.env.GOOGLE_API_KEY || 'api-key-missing'
      const infoLines = await vehicleInfo(vehicle, googleApiKey)
      const response = [`Vehicle: ${vehicle.displayName}`].concat(infoLines).join('\n')
      res.json(toSlackMessage(response))
    } else {
      res.json(toSlackMessage(`Specify one of the vehicle names: ${vehicleNames.join(', ')}`))
    }
  } catch (err) {
    if (err.response && err.response.data) {
      console.error(`vehicle=${name}`, err.response.data)
      if (err.response.data.error.startsWith('vehicle unavailable')) {
        res.json(toSlackMessage(`Tesla API call failed: Vehicle unavailable`))
      } else {
        res.json(toSlackMessage(`Tesla API call failed: ${err.response.data.error}`))
      }
    } else {
      console.error(`vehicle=${name}`, err)
      res.json(toSlackMessage('Tesla API call failed'))
    }
  }
})

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Listening on *:${port}`))

function toSlackMessage(text) {
  return {text, username: process.env.SLACK_BOT_NAME || 'Tesla Bot'}
}
