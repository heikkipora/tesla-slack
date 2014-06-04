Talking to the Tesla
====

![](tessi.jpg?raw=true)

We got our Intergalactic SpaceBoat of Light and Wonder, as [Oatmeal](http://theoatmeal.com/comics/tesla_model_s) rightly put it, in May.

It will be used as a platform for both developing new services and research projects with the Ministry of Transport and Communications.
But most importantly for me, it is available for Reaktorians to drive and tinker with.

Sharing a revolutionary all-electric car with a tightly allocated calendar resulted in a constant flow of queries:

* Where is it?
* Is it heading back home already?
* How much juice is left in the battery and what is the expected range if I get the keys and hit the road now?
* Is it connected to a high-powered charger at Q-Park?

I decided to invest a couple of hours of my time one morning and code a small 'Tesla-bot' that answers these questions automatically.
It's implemented in javascript and Node.js and resides on [Heroku](http://heroku.com).

Enter Slack
-----

![](screenshot.png?raw=true)

We rely heavily on [Slack](https://slack.com) as our internal real-time communications medium. It seemed like a natural place to build a Tesla-bot for.
Slack provides an easy-to-use [Outgoing WebHooks API](https://api.slack.com/) for integrating external services.

Receiving and responding to messages tagged in Slack is as simple as handling a HTTP POST request:

    var app = require('express')();
    app.use(require('body-parser')());

    app.post('/slack', function (req, res) {
      if (req.body.token === SLACK_RECEIVE_TOKEN) {
        res.json({ text: 'Supported commands: battery, honk, position, vehicle, climate', username: SLACK_BOT_NAME });
      } else {
        res.send(403);
      }
    });

There's a ready-made Node.js client module called [teslams](https://github.com/hjespers/teslams) for the [Tesla Model S REST API](http://docs.timdorr.apiary.io) so rest of the integration is smooth as well.

Authentication
---

In order to gain access to the car we need to authenticate and fetch the vehicle id of our Tesla Model S.
As a part of a successful authentication the Tesla API returns an access token, which provides full access to the rest of the API endpoints.
Fortunately the ``teslams`` module takes care of authentication behind the scenes as long it is provided with user credentials.

    var teslams = require('teslams');
    teslams.get_vid({ email: 'username@tesla', password: 'pa55w0rd' }, function(vehicleId) {
      // store vehicleId for future calls
    });

Where's my car?
---

Getting the position and speed of the car is as simple as asking for it with ``get_drive_state()``.
All the API calls talk JSON so it's trivial to pick only the values we're interested in.

    teslams.get_drive_state(vehicleId, function(driveState) {
      var speedInKmH = driveState.speed * 1.60934;
      var latitude = driveState.latitude;
      var longitude = driveState.longitude;
    });

This API call is heavily rate-limited by Tesla and is clearly meant for one-off queries.
For monitoring the car in real-time there's a long-polling stream API accessible with ``teslams.stream()``.

When is my car ready to go?
---

Driving an electric car in present-day world means you need to keep an eye on the state of the battery. Charging stations, especially quick ones, are still scarce.
The ``get_charge_state()`` API call provides verbose information about the battery and charging conditions.
Only the most crucial ones are shown here, look up the rest from the API documentation.

    teslams.get_charge_state(vehichleId, function(chargeState) {
      var state = state.charging_state; // one of 'Charging', 'Disconnected', 'Fully charged'
      var timeToFullInHours = state.time_to_full_charge; // valid when charging
      var chargerPowerInKw = state.charger_power; // valid when charging
    });

Some of the more 'funny' functionalities include being able to flash the lights and honk the horn remotely.
Fortunately, these calls don't have an effect while the car is being driven :)

Conclusion
---

During these few weeks with the Tesla Model S I have learnt that having an always-online car doesn't mean exactly that it is actually always online.
The car looses connectivity occasionally (it's a 3G data link anyways) and the on-board Ubuntu-powered computer needs to be rebooted as a last resort if it does not recover by itself.

At the moment, error-handling capabilities of the ``teslams`` module are also sub-par as no error information is passed to the callbacks.

Source code for the bot is available on [GitHub](https://github.com/heikkipora/tesla-slack), so feel free to contribute a pull request.
Some of my enthusiastic colleagues already did, thanks for that! Please note that my implementation leverages the excellent [Bacon.js](https://github.com/baconjs/bacon.js) FRP library, which I omitted from the examples above for the sake of brevity.

Welcome to the future!
