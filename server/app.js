var SLACK_BOT_NAME = process.env.SLACK_BOT_NAME || 'Tesla Model S';
var SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#tesla';

var env = process.env.NODE_ENV || 'dev';
if (env === 'production') {
    require('newrelic');
}

var express = require('express'),
    tesla = require('./tesla'),
    models = require('./models'),
    mongoose = require('mongoose'),
    CronJob = require('cron').CronJob,
    Slack = require('node-slack'),
    Bacon = require('baconjs').Bacon;

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
        username: SLACK_BOT_NAME,
        channel: SLACK_CHANNEL
    };
}

function hasCommand(req, name) {
    return req.body.text.indexOf(name) >= 0;
}

app.post('/slack', function (req, res) {
    if (req.body.token === process.env.SLACK_RECEIVE_TOKEN) {
        if (hasCommand(req, 'battery')) {
            tesla.chargeState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'climate')) {
            tesla.climateState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'position')) {
            tesla.formattedDriveState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'vehicle')) {
            tesla.vehicleState().map(toSlackMessage).onValue(sendJson(res));
        } else if (hasCommand(req, 'honk')) {
            res.json(toSlackMessage(':trumpet: TÖÖÖÖÖT-TÖÖÖÖÖÖÖÖÖÖÖT!'));
        } else {
            res.json(toSlackMessage('Supported commands: battery, honk, position, vehicle, climate'));
        }
    } else {
        res.send(403);
    }
});

app.get('/', function (req,res) {
    res.send('ok'); // used for newrelic monitoring at Heroku
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});

var slack = new Slack(process.env.SLACK_DOMAIN, process.env_SEND_TOKEN);

var updateDriveStateJob =  new CronJob('* * * * *', function(){
  var driveState = Bacon.retry({source: tesla.driveState,
                                retries: 3,
                                delay: function(){return 5000;}});
  driveState.onError(function(error) {
    console.error("Error fetching driveState:", error);
  });
  driveState.onValue(saveDriveState);

});


var informDepartureOrArrivalJob =  new CronJob( '* * * * * ', function(){
  models.DriveState.find().sort('-_id').limit(2).exec().then(function(results) {
    var lastState = _.first(results);
    var nextToLastState = _.last(results);
    var place = tesla.isInAlreadyKnownPlace(lastState.latitude, lastState.longitude);
    if(tesla.hasArrivedToKnownPlace(lastState, nextToLastState)){
      console.log("I have just arrived in " + place.name);
      slack.send(toSlackMessage("I have just arrived in " + place.name));
    }
    else if (tesla.hasDepartedFromKnownPlace(lastState, nextToLastState)) {
      console.log("I have just departed from " + place.name);
      slack.send(toSlackMessage("I have just departed from " + place.name));
    }
  });
});

function saveDriveState(state){
  console.log("Persisting: ", state);
  new models.DriveState(state).save();
}

mongoose.connect(process.env.MONGOHQ_URL || process.env.MONGOLAB_URL ||'mongodb://localhost/tesla', function(err){
  if(err){
    console.log("Database connection failed, not using features requiring database");
  }
  else {
    updateDriveStateJob.start();
    informDepartureOrArrivalJob.start();
  }
});