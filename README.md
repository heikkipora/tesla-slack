tesla-slack
===========

Integrates your Tesla Model S/X fleet to https://slack.com

!["Slack integration screenshot"](screenshot.png)

Uses https://github.com/gutenye/tesla-api for Tesla portal integration.

Take a look at http://docs.timdorr.apiary.io for reference

I [blogged](blogpost.md) about the integration at Reaktor's site: https://www.reaktor.com/blog/talking-tesla

Requirements
------------

Node.js 7.9.0 from https://nodejs.org

The following ENV variables:
* TESLA_USERNAME - username to the Tesla portal
* TESLA_PASSWORD - password to the Tesla portal
* SLACK_RECEIVE_TOKEN - for "outgoing Slack webhooks"

Testing locally
---------------

Start it

    npm start

Fetch vehicle list:

    curl --data "token=<insert-SLACK_RECEIVE_TOKEN-here>&text=!tesla" http://localhost:5000/slack

Fetch vehicle battery, speed and location information:

    curl --data "token=<insert-SLACK_RECEIVE_TOKEN-here>&text=!tesla <inser-vehicle-name-name>" http://localhost:5000/slack

Works nicely when deployed to Heroku.

Point the outoing Slack webhook configuration to /slack on your Node.js instance.
