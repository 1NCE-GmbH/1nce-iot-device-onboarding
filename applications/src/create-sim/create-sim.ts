import {
  type SQSEvent,
  type SQSRecord,
} from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SIM } from "../shared/types/sim";
import { putItem } from "../shared/utils/dynamoHelper";
import { IoTCoreCertificate } from "../shared/types/iotCoreCertificate";
import { IoTCoreThing } from "../shared/types/iotCoreThing";
import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { deleteIotCertificate, deleteIotThing } from "../shared/services/iotCoreService";
import { publishRegistrationToMqtt, publishSuccessSummaryToSns } from "../shared/services/successMessageService";

const SIMS_TABLE = process.env.SIMS_TABLE as string;
const IOT_CORE_POLICY_NAME = process.env.IOT_CORE_POLICY_NAME as string;

export const handler = async (event: SQSEvent): Promise<void> => {
  await Promise.allSettled(
    event.Records.map(async (record: SQSRecord) => handleSQSRecord(record)),
  );
};

async function handleSQSRecord(record: SQSRecord): Promise<void> {
  const body = parseRecordBody(record);
  const sim = new SIM(body);

  const simCreated = await createSim(sim);
  if (!simCreated) {
    console.error("FAILURE device not created", body);
    return;
  }

  console.log("SUCCESS device created", body);
}

function parseRecordBody(record: SQSRecord): any {
  try {
    return JSON.parse(record.body);
  } catch (error) {
    console.error(`error parsing SQS record body: ${record.body}`, error);
  }
}

async function createSim(sim: SIM): Promise<boolean> {
  let iotCoreCertificate: IoTCoreCertificate | undefined;
  let iotCoreThing: IoTCoreThing | undefined;

  try {
    // Generate new certificate and attach it to policy
    iotCoreCertificate = await IoTCoreCertificate.create();
    await iotCoreCertificate.attachPolicy(IOT_CORE_POLICY_NAME);
    sim.setCertificate(iotCoreCertificate);

    // Create thing and attach it to certificate
    iotCoreThing = await IoTCoreThing.create(sim.iccid);
    await iotCoreThing.attachCertificate(iotCoreCertificate.arn);

    // Create SIM in dynamoDB
    await putItem({ TableName: SIMS_TABLE, Item: marshall(sim.toItem()) });

    // Publish MQTT and SNS messages
    await Promise.allSettled([
      publishRegistrationToMqtt(sim),
      publishSuccessSummaryToSns(sim),
    ]);

    return true;
  } catch (error: unknown) {
    console.error("Error creating SIM", error);
    await publishErrorToSnsTopic(error, sim);

    await deleteIoTCoreResources(iotCoreThing, iotCoreCertificate);

    return false;
  }
}

async function deleteIoTCoreResources(
  thing: IoTCoreThing | undefined,
  certificate: IoTCoreCertificate | undefined,
): Promise<void> {
  if (thing && certificate) {
    await deleteIotThing(thing, certificate);
  }

  if (certificate) {
    await deleteIotCertificate(certificate);
  }
}
