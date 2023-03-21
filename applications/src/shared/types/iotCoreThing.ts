import { attachCertToThing, createThing } from "../utils/awsIotCoreHelper";

export class IoTCoreThing {
  name: string;

  constructor(thing: IIoTCoreThing) {
    this.name = thing.name;
  }

  async attachCertificate(certArn: string): Promise<void> {
    await attachCertToThing(certArn, this.name);
  }

  static async create(thingName: string): Promise<IoTCoreThing> {
    const thing = await createThing(thingName);
    return new IoTCoreThing(thing);
  }
}

export interface IIoTCoreThing {
  name: string;
}
