import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TuyaCloudPlatformAccessory } from './platformAccessory';
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * TuyaCloudHomebridgePlatform
 * Access to Tuya cloud and control them.
 */
export class TuyaCloudHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private sha256 = require('js-sha256');
  private accessToken: string = "";

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.refreshToken();
    });

  }

  private delay(t): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, t);
    });
  }

  private calc_sign(message: string, key: string): string {
    let sign = "";
    return this.sha256.hmac.update(key, message).hex().toUpperCase();
  }

  public async get(url: string, params:any, data:string): Promise<any>{
    let base = this.config.url;
    let t = Math.round(Date.now());
    let sign = this.calc_sign(this.config.clientID + this.accessToken + t, this.config.secret);
    var headers = {
        "client_id": this.config.clientID,
        "sign": sign,
        "t": t.toString(),
        "sign_method": "HMAC-SHA256"
    }
    if (this.accessToken == "") {
      headers["secret"] = this.config.secret;      
    } else {
      headers["access_token"] = this.accessToken;      
    }
    return axios({
      headers: headers,
      url: url,
      baseURL: this.config.url,
      params: params,
      data: data,
      method: "GET"
    });
  }

  private async refreshToken(retryingAfterError = false): Promise<string> {
    this.log.debug('API access point:', this.config.url);

    // Reset the access token.
    this.accessToken = "";
    var response = (await this.get("/v1.0/token?grant_type=1", "", ""));
    var data = response.data;

    this.log.debug(`Response:${JSON.stringify(data)}`);
    if (response.status != 200) {
      this.log.error("Error retrieving the access token.");
      await this.delay(65 * 1000);
      this.log.info("Retrying authentication after previous error.");
      return this.refreshToken(true);
    }
  
    this.accessToken = data.result.access_token;
    this.log.info(`Retrieved an access token ${this.accessToken}.`);
  
    // run the method to discover / register your devices as accessories
    this.discoverDevices();

    setTimeout(() => {
      this.refreshToken();
    }, (data.result.expire_time / 2) * 1000);

    return "";
  }
  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Call devices methods and retrieve a list of devices.
   */
  async discoverDevices() {
    // var params = {
    //   "page_no": 0,
    //   "page_size": 100
    // }
    // var data = (await this.get("/v1.0/devices", params, "")).data;

    // this.log.debug(`Response:${JSON.stringify(data)}`);
    // if (data.responseStatus === "error") {
    //   this.log.error("Error retrieving the device list.");
    // }
    

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.deviceList) {
      this.log.info(`Discovering devices: ${device}.`);

      const uuid = this.generateUUID(device);//.deviceID;

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        if (device) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          new TuyaCloudPlatformAccessory(this, existingAccessory);
          
          // update accessory cache with any changes to the accessory details and information
          this.api.updatePlatformAccessories([existingAccessory]);
        } else if (!device) {
          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
          // remove platform accessories when no longer present
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        }
      } else {
        var displayName = "test";
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', displayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(displayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new TuyaCloudPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  public get generateUUID(): (BinaryLike) => string {
    return this.api.hap.uuid.generate;
  }
}
