import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { fromItem, keyFromIp, type IDynamoSim, type SIM } from "../types/sim";
import { getItem, scan, updateItem } from "../utils/dynamoHelper";
import { ConditionalCheckFailedException, type UpdateItemCommandInput, type GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { NotFoundError } from "../types/error";

const SIMS_TABLE = process.env.SIMS_TABLE as string;

export async function getDbSims(): Promise<SIM[]> {
  try {
    const dbSims = await scan({ TableName: SIMS_TABLE });

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

export async function disableSim(ip: string, iccid: string): Promise<SIM> {
  try {
    const input: UpdateItemCommandInput = {
      TableName: SIMS_TABLE,
      Key: keyFromIp(ip),
      ConditionExpression: "i=:iccid AND a=:oldActive",
      UpdateExpression: "SET ut=:updateTime, a=:active",
      ExpressionAttributeValues: marshall({
        ":updateTime": new Date().toISOString(),
        ":oldActive": true,
        ":active": false,
        ":iccid": iccid,
      }),
      ReturnValues: "ALL_NEW",
    };
    const dbSim = await updateItem(input);

    if (!dbSim.Attributes) {
      throw new NotFoundError(`Sim not found for ip ${ip} and iccid ${iccid}`);
    }

    return fromItem(unmarshall(dbSim.Attributes) as IDynamoSim);
  } catch (error) {
    console.error(`FAILURE updating sim with ip=${ip} and iccid=${iccid}`, error);

    if (error instanceof ConditionalCheckFailedException) {
      throw new Error(`Sim with ip ${ip} and iccid ${iccid} is already disabled or does not exist`);
    }

    throw error;
  }
}
