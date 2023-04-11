import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { getAllSims, getAuthToken } from "../shared/services/managementApiService";
import { getDbSims } from "../shared/services/simService";
import { type SIM } from "../shared/types/sim";
import { sendSQSBatchMessages } from "../shared/utils/sqsHelper";

const SIM_CREATE_QUEUE_URL = process.env.SIM_CREATE_QUEUE_URL as string;
const SIM_DISABLE_QUEUE_URL = process.env.SIM_DISABLE_QUEUE_URL as string;

export const handler = async (): Promise<void> => {
  try {
    await simRetrieval();
  } catch (error) {
    console.error("Error retrieving SIMs", error);
    await publishErrorToSnsTopic("SIM retrieve failed", error);
  }
};

async function simRetrieval(): Promise<void> {
  const authToken = await getAuthToken();
  const apiSimList = await getAllSims(authToken);
  console.log(`SIMs returned by API: ${apiSimList.length}`);

  const dbSimList = await getDbSims();
  console.log(`SIMs returned by database: ${dbSimList.length}`);

  const createSimMessages = getSimsToCreate(apiSimList, dbSimList).map(sim => sim.buildSqsMessageEntry());
  console.log(`SIMs to be created: ${createSimMessages.length}`);
  const disableSimMessages = getSimsToDisable(apiSimList, dbSimList).map(sim => sim.buildSqsMessageEntry());
  console.log(`SIMs to be disabled: ${disableSimMessages.length}`);

  const batchResults = await Promise.allSettled([
    createSimMessages.length ? sendSQSBatchMessages(SIM_CREATE_QUEUE_URL, createSimMessages) : Promise.resolve(),
    disableSimMessages.length ? sendSQSBatchMessages(SIM_DISABLE_QUEUE_URL, disableSimMessages) : Promise.resolve(),
  ]);

  const errors: string[] = batchResults
    .filter(result => result.status === "rejected")
    .map(result => (result as PromiseRejectedResult).reason);

  if (errors.length) {
    throw new Error(JSON.stringify(errors));
  }
}

function getSimsToCreate(apiSimList: SIM[], dbSimList: SIM[]): SIM[] {
  return apiSimList
    .filter(apiSim => {
      const dbSim = dbSimList.find(dbSim => dbSim.iccid === apiSim.iccid && dbSim.ip === apiSim.ip);

      // Create if sim does not exist in db or not active
      return !dbSim?.active;
    });
}

function getSimsToDisable(apiSimList: SIM[], dbSimList: SIM[]): SIM[] {
  return dbSimList
    .filter(dbSim => {
      // need to check also IP address if sim with same ICCID was migrated away, but then same SIM was migrated
      // back with new IP, we need to disable entry with the old IP
      // we will get two entries with same ICCID, but at least one of those will be disabled
      const apiSim = apiSimList.find(apiSim => apiSim.iccid === dbSim.iccid && apiSim.ip === dbSim.ip);
      return dbSim.active && !apiSim;
    });
}
