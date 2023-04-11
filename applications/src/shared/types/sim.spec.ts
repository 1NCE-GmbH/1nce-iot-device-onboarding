import { fromItem, keyFromIp, SIM } from "./sim";

console.log = jest.fn();
console.error = jest.fn();
const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("SIM", () => {
  const sim: SIM = new SIM({
    iccid: "123456789",
    ip: "10.0.0.0",
    createdTime: mockDate.toISOString(),
    updatedTime: mockDate.toISOString(),
    active: true,
    certificate: "pem",
    privateKey: "private-key",
  });

  const dynamoDbSimItem = {
    PK: "IP#10.0.0.0",
    SK: "P#MQTT",
    crt: "pem",
    ct: "2023-02-01T00:00:00.000Z",
    ut: "2023-02-01T00:00:00.000Z",
    i: "123456789",
    ip: "10.0.0.0",
    prk: "private-key",
    a: true,
  };

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

  describe("constructor", () => {
    it("should build and return SIM instance", async () => {
      const result = new SIM({
        iccid: "123456789",
        ip: "10.0.0.0",
        active: true,
        certificate: "certificate",
        privateKey: "private_key",
      });

      expect(result.iccid).toEqual("123456789");
      expect(result.ip).toEqual("10.0.0.0");
      expect(result.createdTime).toEqual(mockDate);
      expect(result.updatedTime).toEqual(mockDate);
    });

    it("should build and return SIM instance with defined created/updated times", async () => {
      const result = new SIM({
        iccid: "123456789",
        createdTime: "2023-02-01T00:00:00.000Z",
        updatedTime: "2023-02-01T00:00:00.000Z",
        ip: "10.0.0.0",
        active: true,
        certificate: "certificate",
        privateKey: "private_key",
      });

      expect(result.iccid).toEqual("123456789");
      expect(result.ip).toEqual("10.0.0.0");
      expect(result.createdTime).toEqual(new Date("2023-02-01T00:00:00.000Z"));
      expect(result.updatedTime).toEqual(new Date("2023-02-01T00:00:00.000Z"));
    });
  });

  describe("buildSqsMessageEntry", () => {
    it("should build and return SQS message entry", async () => {
      const result = sim.buildSqsMessageEntry();

      expect(result).toStrictEqual({
        Id: "123456789",
        MessageDeduplicationId: "123456789",
        MessageGroupId: "sims",
        MessageBody: JSON.stringify({
          iccid: "123456789",
          ip: "10.0.0.0",
        }),
      });
    });
  });

  describe("toItem", () => {
    it("should build dynamo item", () => {
      const result = sim.toItem();

      expect(result).toStrictEqual({
        PK: "IP#10.0.0.0",
        SK: "P#MQTT",
        a: true,
        crt: "pem",
        ct: mockDate.toISOString(),
        ut: mockDate.toISOString(),
        i: "123456789",
        ip: "10.0.0.0",
        prk: "private-key",
      });
    });
  });

  describe("toMessage", () => {
    it("should build SIM message", () => {
      const result = sim.toMessage("message");

      expect(result).toStrictEqual({
        iccid: "123456789",
        ip: "10.0.0.0",
        message: "message",
        timestamp: mockDate.getTime(),
      });
    });
  });

  describe("fromItem", () => {
    it("should covert input into SIM instance", async () => {
      const result = fromItem(dynamoDbSimItem);

      expect(result.iccid).toEqual("123456789");
      expect(result.ip).toEqual("10.0.0.0");
      expect(result.createdTime).toEqual(new Date("2023-02-01T00:00:00.000Z"));
      expect(result.updatedTime).toEqual(new Date("2023-02-01T00:00:00.000Z"));
    });
  });

  describe("keyFromIp", () => {
    it("should return valid PK/SK response", () => {
      const result = keyFromIp("10.0.0.0");

      expect(result).toStrictEqual({
        PK: { S: "IP#10.0.0.0" },
        SK: { S: "P#MQTT" },
      });
    });
  });
});
