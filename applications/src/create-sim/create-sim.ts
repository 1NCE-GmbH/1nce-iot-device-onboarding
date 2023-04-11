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
import { parseSimRetrievalSqsBody } from "../shared/utils/sqsHelper";

const SIMS_TABLE = process.env.SIMS_TABLE as string;
const IOT_CORE_POLICY_NAME = process.env.IOT_CORE_POLICY_NAME as string;
const SUCCESS_SUMMARY_MESSAGE = "SIM enabled";

export const handler = async (event: SQSEvent): Promise<void> => {
  await Promise.allSettled(
    event.Records.map(async (record: SQSRecord) => handleSQSRecord(record)),
  );
};

async function handleSQSRecord(record: SQSRecord): Promise<void> {
  let iotCoreCertificate: IoTCoreCertificate | undefined;
  let iotCoreThing: IoTCoreThing | undefined;
  let sim: SIM | undefined;

  try {
    const body = parseSimRetrievalSqsBody(record);

    // Generate new certificate
    iotCoreCertificate = await IoTCoreCertificate.create();

    // Create SIM instance
    sim = new SIM({
      iccid: body.iccid,
      ip: body.ip,
      active: true,
      certificate: iotCoreCertificate.certificate,
      privateKey: iotCoreCertificate.privateKey,
    });

    // Attach policy to certificate
    await iotCoreCertificate.attachPolicy(IOT_CORE_POLICY_NAME);

    // Create thing and attach it to certificate
    iotCoreThing = await IoTCoreThing.create(sim.iccid);
    await iotCoreThing.attachCertificate(iotCoreCertificate.arn);

    // Create SIM in dynamoDB
    await putItem({ TableName: SIMS_TABLE, Item: marshall(sim.toItem()) });

    // Publish MQTT and SNS messages
    await Promise.allSettled([
      publishRegistrationToMqtt(sim, SUCCESS_SUMMARY_MESSAGE),
      publishSuccessSummaryToSns(sim, SUCCESS_SUMMARY_MESSAGE),
    ]);

    console.log("SUCCESS SIM created", sim);
  } catch (error: unknown) {
    console.error("FAILURE SIM not created", error, sim ?? record);

    await publishErrorToSnsTopic("SIM enable failed", error, sim);

    await deleteIoTCoreResources(iotCoreThing, iotCoreCertificate);
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
