import { DynamoDB, ScanCommand, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { scan, putItem, getItem, updateItem } from "../utils/dynamoHelper";

console.log = jest.fn();

describe("dynamoHelper", () => {
  const DynamoDbClientMock = mockClient(DynamoDB);

  beforeEach(() => {
    DynamoDbClientMock.reset();
    jest.resetAllMocks();
  });

  describe("scan", () => {
    it("should scan and return items with pagination", async () => {
      const params = {
        TableName: "test",
        Key: {
          PK: "PK",
        },
        Limit: 1,
      };

      DynamoDbClientMock.on(
        ScanCommand,
        params,
      ).resolves({ Items: [{ test: 1, item: 2 } as any] });

      const res = await scan(params);
      expect(res).toStrictEqual([{ test: 1, item: 2 }]);
      expect(console.log).toHaveBeenCalledWith("Scanning dynamo items", params);
    });
  });

  describe("putItem", () => {
    it("should put item to dynamoDB", async () => {
      DynamoDbClientMock.on(
        PutItemCommand,
        { TableName: "SIMS_TABLE", Item: marshall({ PK: "pk", SK: "sk" }) },
      ).resolves({ Attributes: {} });

      const params = {
        TableName: "SIMS_TABLE",
        Item: marshall({ PK: "pk", SK: "sk" }),
      };
      const result = await putItem(params);

      expect(result).toStrictEqual({ Attributes: {} });
      expect(console.log).toHaveBeenCalledWith("dynamo put item", params);
    });
  });

  it("should get single item from db", async () => {
    const params = {
      TableName: "test",
      Key: {
        PK: { S: "ip" },
        SK: { S: "P#MQTT" },
      },
    };

    DynamoDbClientMock.on(
      GetItemCommand,
      params,
    ).resolves({ Item: { test: 1 } as any });

    const res = await getItem(params);
    expect(res).toStrictEqual({ test: 1 });
    expect(console.log).toHaveBeenCalledWith("Getting item from dynamo with ", params);
  });

  describe("updateItem", () => {
    it("should update item to dynamoDB", async () => {
      DynamoDbClientMock.on(
        UpdateItemCommand,
        { TableName: "SIMS_TABLE", Key: { PK: { S: "PK" } }, UpdateExpression: "SET ut=:updateTime, a=:active" },
      ).resolves({ Attributes: {} });

      const params = {
        TableName: "SIMS_TABLE",
        Key: { PK: { S: "PK" } },
        UpdateExpression: "SET ut=:updateTime, a=:active",
      };
      const result = await updateItem(params);

      expect(result).toStrictEqual({ Attributes: {} });
      expect(console.log).toHaveBeenCalledWith("dynamo update item", params);
    });
  });
});
