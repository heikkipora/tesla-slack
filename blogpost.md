Talking to the Tesla
====

![](tessi.jpg?raw=true)

We got our Intergalactic SpaceBoat of Light and Wonder, as [Oatmeal](http://theoatmeal.com/comics/tesla_model_s) righly put it, in May.

It will be used as a platform for developing new services for all-electric, always-connected vehicles in co-operation with LVM, Tekes
- as well as recreational purposes for our people.

Being a revolutionary new vehicle, our people would like to know the whereabout of it.
Where it is currently. Is it resting at one of the high-power charging stations near our offices downtown Helsinki?
How much is the expected range if I get the keys and hit the road now ?
As it happens, the HTTP API Tesla's mobile apps are interfacing have been reverse-engineered. The documentation is available at [http://docs.timdorr.apiary.io]

Suffice to say it is implemented with the Slack 'Outgoing WebHooks API' and runs on the excellent [Heroku](http://heroku.com) cloud service.

Enter Slack
-----

![](screenshot.png?raw=true)

We rely heavily on [Slack](https://slack.com) for our internal real-time communication. It seemed like a natural place to build a Tesla-bot for.
Slack provides an easy-to-use [Outgoing WebHooks API](https://api.slack.com/) for integrating external.

Receiving and responding to messages tagged in Slack is as simple as handling a HTTP POST request:

    var express = require('express');
    var app = express();
    app.use(require('body-parser')());

    app.post('/slack', function (req, res) {
      if (req.body.token === SLACK_RECEIVE_TOKEN) {
        res.json({ text: 'Supported commands: battery, honk, position, vehicle, climate', username: SLACK_BOT_NAME });
      } else {
        res.send(403);
      }
    });

Fortunately there's a ready-made Node.js client module for the Tesla Model S REST API [https://github.com/hjespers/teslams] so rest of the integration is not more difficult.

Authentication
---

In order to get access to the car you need to authenticate and fetch the vehicle id of your Tesla Model S.
As part of a successful authentication the Tesla api returns an access token which provides full access to the rest of the API endpoints.
Fortunately the ```teslams``` module handles this automaitcally as long as you provide your username and password with the 'Get Vehicle Id' call.

    var teslams = require('teslams');
    teslams.get_vid({ email: 'username@tesla', password: 'pa55w0rd' }, function(vehicleId) {
      // store vehicleId for future calls
    });

Where's my car?
---

Getting the position and speed of the vehicle is as simple as asking for it with ``get_drive_state```.
All the API calls return a JSON structure so it's trivial to pick the values we're interested in

    teslams.get_drive_state(vehicleId, function(driveState) {
      var speedInKmH = driveState.speed * 1.60934;
      var latitude = driveState.latitude;
      var longitude = driveState.longitude;
    });

This API call is heavily rate-limited and is clearly meant for one-off queries. For monitoring the car in real-time there's a long-polling stream API accessible with ```teslams.stream()```.

When is my car ready to go?
---

Driving an all-electric vehicle in present-day world means you need to be aware of the battery state. Charging stations, especially quick ones, are still a rarity.
'Get Charge State' API call provides verbose information about the battery and charging conditions. Only the most crucial ones are shown here, look up the rest from the API documentation.

    teslams.get_charge_state(vehichleId, function(chargeState) {
      var state = state.charging_state; // one of 'Charging', 'Disconnected', 'Fully charged'
      var timeToFullInHours = state.time_to_full_charge; // valid when charging
      var chargerPowerInKw = state.charger_power; // valid when charging
    });

Some of the more 'funny' functionality includes being able to flash the lights and honk the horn remotely. These calls do not have any effect when the vehicle is on the road (fortunately :).

Observations
---

During the weeks
Note that the error-handling capabilities of the ```teslams``` module are sub-par at the moment as no error information is passed to the callbacks.
My tesla-slack implementation leverages the excellent [Bacon.js](https://github.com/baconjs/bacon.js) FRP library, which I omitted from the examples above for brevity.
