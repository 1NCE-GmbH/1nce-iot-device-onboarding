import { DynamoDB, ScanCommand, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { query, putItem, getItem } from "../utils/dynamoHelper";

console.log = jest.fn();

describe("dynamoHelper", () => {
  const DynamoDbClientMock = mockClient(DynamoDB);

  beforeEach(() => {
    DynamoDbClientMock.reset();
    jest.resetAllMocks();
  });

  describe("query", () => {
    it("should query and return items", async () => {
      const params = {
        TableName: "test",
        Key: {
          PK: "PK",
        },
      };

      DynamoDbClientMock.on(
        ScanCommand,
        params,
      ).resolves({ Items: [{ test: 1 } as any] });

      const res = await query(params);
      expect(res).toStrictEqual([{ test: 1 }]);
      expect(console.log).toHaveBeenCalledWith("Querying dynamo items", params);
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
});
