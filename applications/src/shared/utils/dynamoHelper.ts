import {
  DynamoDB,
  ScanCommand,
  PutItemCommand,
  GetItemCommand,
  type QueryInput,
  type PutItemCommandInput,
  type PutItemCommandOutput,
  type GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";

const DYNAMO_DB_VERSION = "2012-08-10";

const dynamoDb = new DynamoDB({ apiVersion: DYNAMO_DB_VERSION });

export async function query(params: QueryInput): Promise<any[] | undefined> {
  console.log("Querying dynamo items", params);

  const command = new ScanCommand(params);
  const result = await dynamoDb.send(command);
  return result.Items;
}

export async function getItem(params: GetItemCommandInput): Promise<any | undefined> {
  console.log("Getting item from dynamo with ", params);
  const command = new GetItemCommand(params);
  const result = await dynamoDb.send(command);
  return result.Item;
}

export async function putItem(params: PutItemCommandInput): Promise<PutItemCommandOutput> {
  console.log("dynamo put item", params);
  const command = new PutItemCommand(params);
  return await dynamoDb.send(command);
}
