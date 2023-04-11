import {
  type SQSEvent,
  type SQSRecord,
} from "aws-lambda";
import { parseSimRetrievalSqsBody } from "../shared/utils/sqsHelper";
import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { publishSuccessSummaryToSns } from "../shared/services/successMessageService";
import { disableSim } from "../shared/services/simService";

const SUCCESS_SUMMARY_MESSAGE = "SIM disabled";

export const handler = async (event: SQSEvent): Promise<void> => {
  await Promise.allSettled(
    event.Records.map(async (record: SQSRecord) => handleSQSRecord(record)),
  );
};

async function handleSQSRecord(record: SQSRecord): Promise<void> {
  let sim;
  try {
    const body = parseSimRetrievalSqsBody(record);

    sim = await disableSim(body.ip, body.iccid);

    await publishSuccessSummaryToSns(sim, SUCCESS_SUMMARY_MESSAGE);

    console.log("SUCCESS SIM disabled", body);
  } catch (error) {
    console.error("FAILURE disabling SIM", error, sim ?? record);
    await publishErrorToSnsTopic("SIM disable failed", error, sim);
  }
}
