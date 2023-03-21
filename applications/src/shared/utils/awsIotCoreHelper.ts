import {
  IoTClient,
  CreateThingCommand,
  CreateKeysAndCertificateCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  DeleteCertificateCommand,
  DeleteThingCommand,
  UpdateCertificateCommand,
  DetachThingPrincipalCommand,
  DetachPolicyCommand,
  CertificateStatus,
  type DeleteCertificateCommandOutput,
  type AttachPolicyCommandOutput,
  type DeleteThingCommandOutput,
  type AttachThingPrincipalCommandOutput,
  type UpdateCertificateCommandOutput,
  type DetachThingPrincipalCommandOutput,
  type DetachPolicyCommandOutput,
} from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  PublishCommand,
  type PublishCommandOutput,
} from "@aws-sdk/client-iot-data-plane";
import { type IIoTCoreCertificate } from "../types/iotCoreCertificate";
import { type IIoTCoreThing } from "../types/iotCoreThing";

const MAIN_REGION = process.env.MAIN_REGION as string;
const iot = new IoTClient({ apiVersion: "2015-05-28", region: MAIN_REGION });
const iotData = new IoTDataPlaneClient({ apiVersion: "2015-05-28", region: MAIN_REGION });

export async function generateCertificate(): Promise<IIoTCoreCertificate> {
  console.log("Creating new certificate");

  const command = new CreateKeysAndCertificateCommand({ setAsActive: true });
  const result = await iot.send(command);

  if (!result.certificateId || !result.certificateArn || !result.certificatePem || !result.keyPair?.PrivateKey) {
    throw new Error(`Certificate not generated: ${JSON.stringify(result)}`);
  }

  return {
    id: result.certificateId,
    arn: result.certificateArn,
    pem: result.certificatePem,
    privateKey: result.keyPair.PrivateKey,
  };
}

export async function disableCertificate(certificateId: string): Promise<UpdateCertificateCommandOutput> {
  console.log(`Disabling certificate with id: ${certificateId}`);

  const command = new UpdateCertificateCommand({
    certificateId,
    newStatus: CertificateStatus.INACTIVE,
  });

  return await iot.send(command);
}

export async function deleteCertificate(certificateId: string): Promise<DeleteCertificateCommandOutput> {
  console.log(`Deleting certificate with id: ${certificateId}`);

  const command = new DeleteCertificateCommand({ certificateId });
  return await iot.send(command);
}

export async function attachPolicyToCert(policyName: string, certificateARN: string): Promise<AttachPolicyCommandOutput> {
  console.log(`Attaching policy ${policyName} to certificate ${certificateARN}`);

  const command = new AttachPolicyCommand({
    policyName,
    target: certificateARN,
  });

  return await iot.send(command);
}

export async function detachPolicyFromCert(policyName: string, certificateARN: string): Promise<DetachPolicyCommandOutput> {
  console.log(`Detaching policy ${policyName} from certificate ${certificateARN}`);

  const command = new DetachPolicyCommand({
    policyName,
    target: certificateARN,
  });

  return await iot.send(command);
}

export async function createThing(iccid: string): Promise<IIoTCoreThing> {
  console.log(`Creating thing for the SIM iccid ${iccid}`);

  const command = new CreateThingCommand({
    thingName: iccid,
    attributePayload: { attributes: { ICCID: iccid } },
  });
  const result = await iot.send(command);

  if (!result.thingName) {
    throw new Error(`Thing not created for the device ICCID ${iccid}: ${JSON.stringify(result)}`);
  }

  return {
    name: result.thingName,
  };
}

export async function deleteThing(thingName: string): Promise<DeleteThingCommandOutput> {
  console.log(`Deleting thing ${thingName}`);

  const command = new DeleteThingCommand({ thingName });
  return await iot.send(command);
}

export async function attachCertToThing(certificateARN: string, thingName: string): Promise<AttachThingPrincipalCommandOutput> {
  console.log(`Attaching certificate ${certificateARN} to thing ${thingName}`);

  const command = new AttachThingPrincipalCommand({
    principal: certificateARN,
    thingName,
  });

  return await iot.send(command);
}

export async function detachCertFromThing(certificateARN: string, thingName: string): Promise<DetachThingPrincipalCommandOutput> {
  console.log(`Detaching certificate ${certificateARN} from thing ${thingName}`);

  const command = new DetachThingPrincipalCommand({
    principal: certificateARN,
    thingName,
  });

  return await iot.send(command);
}

export async function publishToMqtt(topic: string, message: string): Promise<PublishCommandOutput> {
  console.log(`Publishing message to MQTT topic ${topic}`, message);

  const command = new PublishCommand({
    topic,
    payload: Buffer.from(message),
  });

  return await iotData.send(command);
}
