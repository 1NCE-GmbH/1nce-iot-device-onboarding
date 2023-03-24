import { mocked } from "jest-mock";
import { SIM } from "../types/sim";
import { getItem, query } from "../utils/dynamoHelper";
import { getDbSimByIp, getDbSims } from "./simService";

jest.mock("../utils/dynamoHelper");
jest.mock("../utils/awsIotCoreHelper");
jest.mock("../utils/snsHelper");

const mockQuery = mocked(query);
const mockGetItem = mocked(getItem);
console.error = jest.fn();
console.log = jest.fn();

describe("SIM Service", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2022-04-02T09:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

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
});
