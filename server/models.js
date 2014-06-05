var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var driveStateSchema = new Schema({
  created_at: { type: Date, default: Date.now },
  shift_state: String,
  speed: Number,
  latitude: Number,
  longitude: Number,
  /* for future geo queries*/
  location: [Number],
  heading: Number,
  gps_as_of: Number
});

exports.DriveState = mongoose.model('DriveState', driveStateSchema);