process.env.SIMS_TABLE = "SIMS_TABLE";

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mocked } from "jest-mock";
import { NotFoundError } from "../types/error";
import { SIM } from "../types/sim";
import { getItem, query, updateItem } from "../utils/dynamoHelper";
import { disableSim, getDbSimByIp, getDbSims } from "./simService";

jest.mock("../utils/dynamoHelper");
jest.mock("../utils/awsIotCoreHelper");
jest.mock("../utils/snsHelper");

const mockQuery = mocked(query);
const mockGetItem = mocked(getItem);
const mockUpdateItem = mocked(updateItem);
console.error = jest.fn();
console.log = jest.fn();
const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("SIM Service", () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: mockDate.getTime(),
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getDbSims", () => {
    it("should return SIM instances array", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          PK: { S: "" },
          SK: { S: "" },
          i: { S: "1111111111" },
          ip: { S: "10.0.0.1" },
          ct: { S: "2023-02-01T00:00:00.000Z" },
          ut: { S: "2023-02-01T00:00:00.000Z" },
          a: { BOOL: true },
          crt: { S: "certificate" },
          prk: { S: "private_key" },
        },
        {
          PK: { S: "" },
          SK: { S: "" },
          i: { S: "2222222222" },
          ip: { S: "10.0.0.2" },
          ct: { S: "2023-02-01T00:00:00.000Z" },
          ut: { S: "2023-02-01T00:00:00.000Z" },
          a: { BOOL: true },
          crt: { S: "certificate" },
          prk: { S: "private_key" },
        },
      ]);

      const result = await getDbSims();

      expect(result).toStrictEqual([
        new SIM({
          iccid: "1111111111",
          ip: "10.0.0.1",
          createdTime: "2023-02-01T00:00:00.000Z",
          updatedTime: "2023-02-01T00:00:00.000Z",
          active: true,
          certificate: "certificate",
          privateKey: "private_key",
        }),
        new SIM({
          iccid: "2222222222",
          ip: "10.0.0.2",
          createdTime: "2023-02-01T00:00:00.000Z",
          updatedTime: "2023-02-01T00:00:00.000Z",
          active: true,
          certificate: "certificate",
          privateKey: "private_key",
        }),
      ]);
      expect(mockQuery).toHaveBeenCalledWith({ TableName: "SIMS_TABLE" });
    });

    it("should return empty array when query result is null", async () => {
      mockQuery.mockResolvedValueOnce(undefined);

      const result = await getDbSims();

      expect(result).toStrictEqual([]);
    });

    it("should throw error when the database query fails", async () => {
      mockQuery.mockRejectedValueOnce("Database error");

      try {
        await getDbSims();
        fail("Test should throw error");
      } catch (error) {
        expect(error).toStrictEqual("Database error");
      }

      expect(console.error).toHaveBeenCalledWith("FAILURE retrieving sims from database", "Database error");
    });
  });

  it("#getDbSimByIp should return SIM", async () => {
    mockGetItem.mockResolvedValueOnce(
      {
        PK: { S: "" },
        SK: { S: "" },
        i: { S: "1111111111" },
        ip: { S: "10.0.0.1" },
        ct: { S: "2023-02-01T00:00:00.000Z" },
        ut: { S: "2023-02-01T00:00:00.000Z" },
        a: { B: true },
        crt: { S: "certificate" },
        prk: { S: "private_key" },
      });

    const result = await getDbSimByIp("10.0.0.1");

    expect(result).toStrictEqual(
      new SIM({
        iccid: "1111111111",
        ip: "10.0.0.1",
        createdTime: "2023-02-01T00:00:00.000Z",
        updatedTime: "2023-02-01T00:00:00.000Z",
        active: true,
        certificate: "certificate",
        privateKey: "private_key",
      }),
    );
  });

  it("#getDbSimByIp should return empty result when getItem result is null", async () => {
    mockGetItem.mockResolvedValueOnce(undefined);

    const result = await getDbSimByIp("");

    expect(result).toStrictEqual(undefined);
  });

  it("#getDbSimByIp should throw error when the getItem fails", async () => {
    mockGetItem.mockRejectedValueOnce("Database error");

    try {
      await getDbSimByIp("ip");
      fail("Test should throw error");
    } catch (error) {
      expect(error).toStrictEqual("Database error");
    }

    expect(console.error).toHaveBeenCalledWith("FAILURE retrieving sim by ip=ip from database", "Database error");
  });

  describe("disableSim", () => {
    describe("when the update sim query throws an error", () => {
      it("and the exception is ConditionalCheckFailedException should throw error with specific message", async () => {
        const error = new ConditionalCheckFailedException({} as any);
        mockUpdateItem.mockRejectedValueOnce(error);

        try {
          await disableSim("10.0.0.0", "123456789");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("Sim with ip 10.0.0.0 and iccid 123456789 is already disabled or does not exist"));
        }

        expect(mockUpdateItem).toBeCalledWith({
          TableName: "SIMS_TABLE",
          Key: {
            PK: { S: "IP#10.0.0.0" },
            SK: { S: "P#MQTT" },
          },
          ConditionExpression: "i=:iccid AND a=:oldActive",
          UpdateExpression: "SET ut=:updateTime, a=:active",
          ExpressionAttributeValues: marshall({
            ":updateTime": new Date().toISOString(),
            ":oldActive": true,
            ":active": false,
            ":iccid": "123456789",
          }),
          ReturnValues: "ALL_NEW",
        });
        expect(console.error).toBeCalledWith("FAILURE updating sim with ip=10.0.0.0 and iccid=123456789", error);
      });

      it("and the exception is unexpected should throw the unexpected error", async () => {
        const error = new Error("Unexpected error");
        mockUpdateItem.mockRejectedValueOnce(error);

        try {
          await disableSim("10.0.0.0", "123456789");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockUpdateItem).toBeCalledWith({
          TableName: "SIMS_TABLE",
          Key: {
            PK: { S: "IP#10.0.0.0" },
            SK: { S: "P#MQTT" },
          },
          ConditionExpression: "i=:iccid AND a=:oldActive",
          UpdateExpression: "SET ut=:updateTime, a=:active",
          ExpressionAttributeValues: marshall({
            ":updateTime": new Date().toISOString(),
            ":oldActive": true,
            ":active": false,
            ":iccid": "123456789",
          }),
          ReturnValues: "ALL_NEW",
        });
        expect(console.error).toBeCalledWith("FAILURE updating sim with ip=10.0.0.0 and iccid=123456789", error);
      });
    });

    describe("when the update sim query does not return Attributes", () => {
      it("should throw NotFoundError", async () => {
        const error = new NotFoundError("Sim not found for ip 10.0.0.0 and iccid 123456789");
        mockUpdateItem.mockResolvedValueOnce({
          $metadata: {},
          Attributes: undefined,
        });

        try {
          await disableSim("10.0.0.0", "123456789");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockUpdateItem).toBeCalledWith({
          TableName: "SIMS_TABLE",
          Key: {
            PK: { S: "IP#10.0.0.0" },
            SK: { S: "P#MQTT" },
          },
          ConditionExpression: "i=:iccid AND a=:oldActive",
          UpdateExpression: "SET ut=:updateTime, a=:active",
          ExpressionAttributeValues: marshall({
            ":updateTime": new Date().toISOString(),
            ":oldActive": true,
            ":active": false,
            ":iccid": "123456789",
          }),
          ReturnValues: "ALL_NEW",
        });
        expect(console.error).toBeCalledWith("FAILURE updating sim with ip=10.0.0.0 and iccid=123456789", error);
      });
    });

    describe("when the update sim is successfully done", () => {
      it("should return SIM instance", async () => {
        mockUpdateItem.mockResolvedValueOnce({
          $metadata: {},
          Attributes: marshall({
            PK: "IP#10.0.0.0",
            SK: "P#MQTT",
            crt: "pem",
            ct: mockDate.toISOString(),
            ut: mockDate.toISOString(),
            i: "123456789",
            ip: "10.0.0.0",
            prk: "private-key",
            a: false,
          }),
        });

        const sim = await disableSim("10.0.0.0", "123456789");

        expect(sim).toStrictEqual(new SIM({
          active: false,
          certificate: "pem",
          privateKey: "private-key",
          iccid: "123456789",
          ip: "10.0.0.0",
          createdTime: mockDate.toISOString(),
          updatedTime: mockDate.toISOString(),
        }));
        expect(mockUpdateItem).toBeCalledWith({
          TableName: "SIMS_TABLE",
          Key: {
            PK: { S: "IP#10.0.0.0" },
            SK: { S: "P#MQTT" },
          },
          ConditionExpression: "i=:iccid AND a=:oldActive",
          UpdateExpression: "SET ut=:updateTime, a=:active",
          ExpressionAttributeValues: marshall({
            ":updateTime": new Date().toISOString(),
            ":oldActive": true,
            ":active": false,
            ":iccid": "123456789",
          }),
          ReturnValues: "ALL_NEW",
        });
        expect(console.error).toBeCalledTimes(0);
      });
    });
  });
});
