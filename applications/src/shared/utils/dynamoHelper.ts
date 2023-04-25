import {
  DynamoDB,
  ScanCommand,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  type QueryInput,
  type PutItemCommandInput,
  type PutItemCommandOutput,
  type GetItemCommandInput,
  type UpdateItemCommandInput,
  type UpdateItemCommandOutput,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

const DYNAMO_DB_VERSION = "2012-08-10";

const dynamoDb = new DynamoDB({ apiVersion: DYNAMO_DB_VERSION });

export async function scan(params: QueryInput): Promise<any[] | undefined> {
  console.log("Scanning dynamo items", params);
  let result, exclusiveStartKey;
  const accumulated = new Array<Record<string, AttributeValue>>();

  do {
    params.ExclusiveStartKey = exclusiveStartKey;

    const command = new ScanCommand(params);
    result = await dynamoDb.send(command);

    exclusiveStartKey = result.LastEvaluatedKey;
    if (result.Items) {
      accumulated.push(...result.Items);
    }
    console.log(`Scanned ${accumulated.length} DB items`);
  } while (result.LastEvaluatedKey);

  return accumulated;
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

export async function updateItem(params: UpdateItemCommandInput): Promise<UpdateItemCommandOutput> {
  console.log("dynamo update item", params);
  const command = new UpdateItemCommand(params);
  return await dynamoDb.send(command);
}
