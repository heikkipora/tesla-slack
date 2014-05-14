tesla-slack
===========

Integrates your Tesla Model S to https://slack.com

Requirements
------------

Node.js & NPM from http://nodejs.org

The following ENV variables:
* TESLA_USERNAME - username to the Tesla portal
* TESLA_PASSWORD - password to the Tesla portal
* SLACK_DOMAIN - your Slack subdomain
* SLACK_SEND_TOKEN - for "incoming Slack webhooks"
* SLACK_RECEIVE_TOKEN - for "outgoing Slack webhooks"

Works nicely when deployed to Heroku.

Point the outoing Slack webhook configuration to /slack on your node.js instance.

