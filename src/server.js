if (process.env.NODE_ENV == 'production') {
  require('newrelic')
}

const Bacon = require('baconjs').Bacon
const bodyParser = require('body-parser')
const express = require('express')
const logfmt = require('logfmt')
const tesla = require('./tesla')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(logfmt.requestLogger())

app.post('/slack', (req, res) => {
  if (req.body.token != process.env.SLACK_RECEIVE_TOKEN) {
    return res.sendStatus(403)
  }

  const args = req.body.text.trim().split(' ')
  const command = args.length > 1 ? args[1] : undefined
  const name = 'tessi'

  if (command === 'battery') {
    tesla.chargeState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res))
  } else if (command === 'climate') {
    tesla.climateState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res))
  } else if (command === 'position') {
    tesla.formattedDriveState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res))
  } else if (command === 'vehicle') {
    tesla.vehicleState(name).mapError(errorText).map(toSlackMessage).onValue(sendJson(res))
  } else {
    res.json(toSlackMessage('Supported commands: battery, climate, position, vehicle.'))
  }
})

app.get('/', (req,res) => {
  res.send('ok') // used for newrelic monitoring at Heroku
})

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Listening on *:${port}`))

function errorText(error) {
  return JSON.stringify(error)
}

function toSlackMessage(text) {
  return { text: text,  username: process.env.SLACK_BOT_NAME || 'Tesla Model S' }
}

function sendJson(res) {
  return message => res.json(message)
}
