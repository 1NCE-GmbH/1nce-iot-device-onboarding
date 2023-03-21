import { unmarshall } from "@aws-sdk/util-dynamodb";
import { fromItem, keyFromIp, type IDynamoSim, type SIM } from "../types/sim";
import { getItem, query } from "../utils/dynamoHelper";
import { type GetItemCommandInput } from "@aws-sdk/client-dynamodb";

const SIMS_TABLE = process.env.SIMS_TABLE as string;

export async function getDbSims(): Promise<SIM[]> {
  try {
    const dbSims = await query({ TableName: SIMS_TABLE });

    return (dbSims ?? []).map(sim => fromItem(unmarshall(sim) as IDynamoSim));
  } catch (error) {
    console.error("FAILURE retrieving sims from database", error);
    throw error;
  }
}

export async function getDbSimByIp(ip: string): Promise<SIM | undefined> {
  try {
    const params: GetItemCommandInput = {
      TableName: SIMS_TABLE,
      Key: keyFromIp(ip),
    };
    const dbSim = await getItem(params);

    return dbSim ? fromItem(unmarshall(dbSim) as IDynamoSim) : undefined;
  } catch (error) {
    console.error(`FAILURE retrieving sim by ip=${ip} from database`, error);
    throw error;
  }
}
