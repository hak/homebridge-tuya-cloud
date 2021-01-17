
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# POC implementation of Tuya Motion sensor Homebridge Plugin

## How to setup
- Install Homebridge
- Install the plugin via
npm install
npm link

- Register a Tuya motion sensor to your Tuya smart app.
- Create a cloud platform project in Tuya.com.
- Link your Tuya smart app account to the cloud project, list the devices and retrieve,
  ClientID
  Secret
  Device ID.
- Fill in config.json in ~/homebridge/ as in the config_sample.json in the POC sample.

- Run homebridge.


