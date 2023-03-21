import { IoTCoreCertificate } from "./iotCoreCertificate";
import { fromItem, keyFromIp, SIM } from "./sim";

console.log = jest.fn();
console.error = jest.fn();

describe("SIM", () => {
  const sim: SIM = new SIM({
    iccid: "123456789",
    ip: "10.0.0.0",
    createdTime: new Date(2023, 1, 1).toISOString(),
    updatedTime: new Date(2023, 1, 1).toISOString(),
    active: true,
    certificate: "certificate",
    privateKey: "private_key",
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2022, 3, 2, 10));
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
      expect(result.createdTime).toEqual(new Date(2022, 3, 2, 10));
      expect(result.updatedTime).toEqual(new Date(2022, 3, 2, 10));
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

  describe("setCertificate", () => {
    it("should set a new certificate", () => {
      const certificate = new IoTCoreCertificate({
        id: "id",
        arn: "arn",
        pem: "pem",
        privateKey: "private-key",
      });

      sim.setCertificate(certificate);

      expect(sim.certificate).toStrictEqual("pem");
      expect(sim.privateKey).toStrictEqual("private-key");
    });
  });

  describe("toItem", () => {
    it("should set a new certificate", () => {
      const result = sim.toItem();

      expect(result).toStrictEqual({
        PK: "IP#10.0.0.0",
        SK: "P#MQTT",
        a: true,
        crt: "pem",
        ct: "2023-02-01T00:00:00.000Z",
        ut: "2023-02-01T00:00:00.000Z",
        i: "123456789",
        ip: "10.0.0.0",
        prk: "private-key",
      });
    });
  });

  describe("toMessage", () => {
    it("should set a new certificate", () => {
      const result = sim.toMessage("message");

      expect(result).toStrictEqual({
        iccid: "123456789",
        ip: "10.0.0.0",
        message: "message",
        timestamp: 1675209600000,
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
