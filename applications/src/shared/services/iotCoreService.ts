import { type IoTCoreCertificate } from "../types/iotCoreCertificate";
import { type IoTCoreThing } from "../types/iotCoreThing";
import { deleteCertificate, deleteThing, detachCertFromThing, detachPolicyFromCert, disableCertificate } from "../utils/awsIotCoreHelper";

const IOT_CORE_POLICY_NAME = process.env.IOT_CORE_POLICY_NAME as string;

export async function deleteIotThing(thing: IoTCoreThing, certificate: IoTCoreCertificate): Promise<void> {
  try {
    await detachCertFromThing(certificate.arn, thing.name);
    await deleteThing(thing.name);
  } catch (error) {
    console.error(`Error deleting IoT thing: ${thing.name}`, error);
  }
}

export async function deleteIotCertificate(certificate: IoTCoreCertificate): Promise<void> {
  try {
    await detachPolicyFromCert(IOT_CORE_POLICY_NAME, certificate.arn);
    await disableCertificate(certificate.id);
    await deleteCertificate(certificate.id);
  } catch (error) {
    console.error(`Error deleting IoT certificate: ${certificate.id}`, error);
  }
}
