import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { TuyaCloudHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TuyaCloudPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: TuyaCloudHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.platform.log.debug(`Initializing:${this.accessory.context.device}`);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tuya')
      .setCharacteristic(this.platform.Characteristic.Model, 'Tuya PIR sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.MotionSensor) || this.accessory.addService(this.platform.Service.MotionSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, "Tuya PIR sencor");

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/MotionSensor

    // register handlers for the MotionDetected Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
        .on('get', this.handleMotionDetectedGet.bind(this));

    setInterval(() => {
      let url = `/v1.0/devices/${this.accessory.context.device}/status`;
      this.platform.log.debug(`Getting Motion sensor status:${this.accessory.context.device}`);
      
      this.platform.get(url, "", "").then((value) => {
        this.platform.log.debug(`Response:${JSON.stringify(value.data)}`);
        let motionDetected = false;

        value.data.result.forEach(data => {
          if (data["code"] == "pir") {
            motionDetected = data["value"] == "pir";
          }
        });
        this.platform.log.debug(`Result:${motionDetected}`);
        // push the new value to HomeKit
        this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
      });
    }, 500);
  }

  handleMotionDetectedGet(callback) {
    this.platform.log.debug('Triggered GET MotionDetected');

    // set this to a valid value for MotionDetected
    const currentValue = 1;

    callback(null, currentValue);
  }
}
