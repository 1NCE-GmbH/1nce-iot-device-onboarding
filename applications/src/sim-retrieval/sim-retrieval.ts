import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { getAllSims, getAuthToken } from "../shared/services/managementApiService";
import { getDbSims } from "../shared/services/simService";
import { type SIM } from "../shared/types/sim";
import { sendSQSBatchMessages } from "../shared/utils/sqsHelper";

const SIM_CREATE_QUEUE_URL = process.env.SIM_CREATE_QUEUE_URL as string;
const SIM_DELETE_QUEUE_URL = process.env.SIM_DELETE_QUEUE_URL as string;

export const handler = async (): Promise<void> => {
  try {
    await simRetrieval();
  } catch (error) {
    console.error("Error retrieving SIMs", error);
    await publishErrorToSnsTopic(error);
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
  const deleteSimMessages = getSimsToDelete(apiSimList, dbSimList).map(sim => sim.buildSqsMessageEntry());
  console.log(`SIMs to be deleted: ${deleteSimMessages.length}`);

  const batchResults = await Promise.allSettled([
    createSimMessages.length ? sendSQSBatchMessages(SIM_CREATE_QUEUE_URL, createSimMessages) : Promise.resolve(),
    deleteSimMessages.length ? sendSQSBatchMessages(SIM_DELETE_QUEUE_URL, deleteSimMessages) : Promise.resolve(),
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
      const dbSim = dbSimList.find(dbSim => dbSim.iccid === apiSim.iccid);
      return !dbSim;
    });
}

function getSimsToDelete(apiSimList: SIM[], dbSimList: SIM[]): SIM[] {
  return dbSimList
    .filter(dbSim => {
      const apiSim = apiSimList.find(apiSim => apiSim.iccid === dbSim.iccid);
      return !apiSim;
    });
}
