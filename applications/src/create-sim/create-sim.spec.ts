process.env.IOT_CORE_POLICY_NAME = "IOT_CORE_POLICY_NAME";
process.env.SIMS_TABLE = "SIMS_TABLE";

import { mocked } from "jest-mock";
import { marshall } from "@aws-sdk/util-dynamodb";
import { handler } from "./create-sim";
import { putItem } from "../shared/utils/dynamoHelper";
import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { IoTCoreCertificate } from "../shared/types/iotCoreCertificate";
import { deleteIotCertificate, deleteIotThing } from "../shared/services/iotCoreService";
import { IoTCoreThing } from "../shared/types/iotCoreThing";
import { publishRegistrationToMqtt, publishSuccessSummaryToSns } from "../shared/services/successMessageService";
import { buildSqsEvent } from "../shared/test/sqs.fixture";

jest.mock("../shared/utils/dynamoHelper");
jest.mock("../shared/services/errorHandlingService");
jest.mock("../shared/services/successMessageService");
jest.mock("../shared/services/iotCoreService");
jest.mock("../shared/types/iotCoreCertificate");
jest.mock("../shared/types/iotCoreThing");
const mockIoTCoreCert = jest.mocked(IoTCoreCertificate);
const mockIoTCoreCertAttachPolicy = jest.fn();
const mockIoTCoreThing = jest.mocked(IoTCoreThing);
const mockIoTCoreThingAttachCert = jest.fn();

const mockPublishErrorToSnsTopic = mocked(publishErrorToSnsTopic);
const mockDeleteIotCertificate = mocked(deleteIotCertificate);
const mockDeleteIotThing = mocked(deleteIotThing);
const mockPutItem = mocked(putItem);
const mockPublishRegistrationToMqtt = mocked(publishRegistrationToMqtt);
const mockPublishSuccessSummaryToSns = mocked(publishSuccessSummaryToSns);
const mockIotCoreCertCreate = mocked(IoTCoreCertificate.create);
const mockIotCoreThingCreate = mocked(IoTCoreThing.create);

console.error = jest.fn();
console.log = jest.fn();
const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("Create SIM", () => {
  let iotCertificate: IoTCoreCertificate;
  let iotThing: IoTCoreThing;

  beforeAll(() => {
    jest.useFakeTimers(
      {
        now: mockDate.getTime(),
      },
    );
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    iotCertificate = new IoTCoreCertificate({ id: "id", arn: "arn", pem: "pem", privateKey: "private-key" });
    iotThing = new IoTCoreThing({ name: "123456789" });
  });

  const dynamoDbSimItem = {
    PK: "IP#10.0.0.0",
    SK: "P#MQTT",
    crt: "pem",
    ct: mockDate.toISOString(),
    ut: mockDate.toISOString(),
    i: "123456789",
    ip: "10.0.0.0",
    prk: "private-key",
    a: true,
  };
  const iotCoreDefaultResponse = { $metadata: {} };

  describe("when SQS event body is not JSON", () => {
    it("should log parsing error", async () => {
      await handler({
        Records: [
          {
            messageId: "id",
            body: "invalid JSON",
            receiptHandle: "handle",
            attributes: {
              ApproximateReceiveCount: "0",
              SentTimestamp: "timestamp",
              SenderId: "sender-id",
              ApproximateFirstReceiveTimestamp: "timestamp",
            },
            messageAttributes: {},
            md5OfBody: "md5",
            eventSource: "source",
            eventSourceARN: "arn",
            awsRegion: "region",
          },
        ],
      });

      expect(console.error).toHaveBeenCalledWith("error parsing SQS record body", expect.any(SyntaxError));
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when SIM certificate is not properly generated", () => {
    it("should log creation error", async () => {
      const error = "Certificate generation error";
      mockIotCoreCertCreate.mockRejectedValueOnce(error);
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();

      const event = buildSqsEvent("123456789", "10.0.0.0");
      await handler(event);

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM enable failed", error, undefined);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE SIM not created", error, event.Records[0]);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when policy is not properly attached to certificate", () => {
    it("should log creation error", async () => {
      const error = "Error Attaching policy to certificate";
      mockIotCoreCertCreate.mockResolvedValueOnce(iotCertificate);
      mockCertificateInstance();
      mockIoTCoreCertAttachPolicy.mockRejectedValueOnce(error);
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();

      await handler(buildSqsEvent("123456789", "10.0.0.0"));

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockIoTCoreCertAttachPolicy).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME");
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM enable failed", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE SIM not created", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when thing is not properly created", () => {
    it("should log creation error", async () => {
      const error = "Error creating thing";
      mockIotCoreCertCreate.mockResolvedValueOnce(iotCertificate);
      mockCertificateInstance();
      mockIoTCoreCertAttachPolicy.mockResolvedValueOnce({});
      mockIotCoreThingCreate.mockRejectedValueOnce(error);
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();
      mockDeleteIotCertificate.mockResolvedValueOnce();

      await handler(buildSqsEvent("123456789", "10.0.0.0"));

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockIoTCoreCertAttachPolicy).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME");
      expect(mockIotCoreThingCreate).toHaveBeenCalledWith("123456789");
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM enable failed", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(mockDeleteIotCertificate).toHaveBeenCalledWith(iotCertificate);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE SIM not created", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when certificate is not properly attached to thing", () => {
    it("should log creation error", async () => {
      const error = "Error attaching certificate to thing";
      mockIotCoreCertCreate.mockResolvedValueOnce(iotCertificate);
      mockCertificateInstance();
      mockIoTCoreCertAttachPolicy.mockResolvedValueOnce({});
      mockIotCoreThingCreate.mockResolvedValueOnce(iotThing);
      mockthingInstance();
      mockIoTCoreThingAttachCert.mockRejectedValueOnce(error);
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();
      mockDeleteIotCertificate.mockResolvedValueOnce();
      mockDeleteIotThing.mockResolvedValueOnce();

      await handler(buildSqsEvent("123456789", "10.0.0.0"));

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockIoTCoreCertAttachPolicy).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME");
      expect(mockIotCoreThingCreate).toHaveBeenCalledWith("123456789");
      expect(mockIoTCoreThingAttachCert).toHaveBeenCalledWith("arn");
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM enable failed", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(mockDeleteIotCertificate).toHaveBeenCalledWith(iotCertificate);
      expect(mockDeleteIotThing).toHaveBeenCalledWith(iotThing, iotCertificate);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE SIM not created", error, {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when dynamo throws an error", () => {
    it("should log creation error", async () => {
      const error = "Error creating entry in dynamoDB";
      mockIotCoreCertCreate.mockResolvedValueOnce(iotCertificate);
      mockCertificateInstance();
      mockIoTCoreCertAttachPolicy.mockResolvedValueOnce({});
      mockIotCoreThingCreate.mockResolvedValueOnce(iotThing);
      mockthingInstance();
      mockIoTCoreThingAttachCert.mockResolvedValueOnce({});
      mockPutItem.mockRejectedValueOnce(new Error(error));
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();
      mockDeleteIotCertificate.mockResolvedValueOnce();
      mockDeleteIotThing.mockResolvedValueOnce();

      await handler(buildSqsEvent("123456789", "10.0.0.0"));

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockIoTCoreCertAttachPolicy).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME");
      expect(mockIotCoreThingCreate).toHaveBeenCalledWith("123456789");
      expect(mockIoTCoreThingAttachCert).toHaveBeenCalledWith("arn");
      expect(mockPutItem).toHaveBeenCalledWith({ TableName: "SIMS_TABLE", Item: marshall(dynamoDbSimItem) });
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM enable failed", new Error(error), {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(mockDeleteIotCertificate).toHaveBeenCalledWith(iotCertificate);
      expect(mockDeleteIotThing).toHaveBeenCalledWith(iotThing, iotCertificate);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE SIM not created", new Error(error), {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when the creation process is completed sucessfully", () => {
    it("should log SIM created successfully", async () => {
      mockIotCoreCertCreate.mockResolvedValueOnce(iotCertificate);
      mockCertificateInstance();
      mockIoTCoreCertAttachPolicy.mockResolvedValueOnce({});
      mockIotCoreThingCreate.mockResolvedValueOnce(iotThing);
      mockthingInstance();
      mockIoTCoreThingAttachCert.mockResolvedValueOnce({});
      mockPutItem.mockResolvedValueOnce(iotCoreDefaultResponse);
      mockPublishRegistrationToMqtt.mockResolvedValueOnce();
      mockPublishSuccessSummaryToSns.mockResolvedValueOnce();

      await handler(buildSqsEvent("123456789", "10.0.0.0"));

      expect(mockIotCoreCertCreate).toHaveBeenCalled();
      expect(mockIoTCoreCertAttachPolicy).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME");
      expect(mockIotCoreThingCreate).toHaveBeenCalledWith("123456789");
      expect(mockIoTCoreThingAttachCert).toHaveBeenCalledWith("arn");
      expect(mockPutItem).toHaveBeenCalledWith({ TableName: "SIMS_TABLE", Item: marshall(dynamoDbSimItem) });
      expect(mockPublishRegistrationToMqtt).toHaveBeenCalledWith({
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      }, "SIM enabled");
      expect(mockPublishSuccessSummaryToSns).toHaveBeenCalledWith({
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      }, "SIM enabled");
      expect(mockDeleteIotCertificate).toHaveBeenCalledTimes(0);
      expect(mockDeleteIotThing).toHaveBeenCalledTimes(0);
      expect(console.error).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith("SUCCESS SIM created", {
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        privateKey: "private-key",
        active: true,
        createdTime: mockDate,
        updatedTime: mockDate,
      });
    });
  });
});

function mockCertificateInstance(): void {
  const mockIoTCoreCertInstance = mockIoTCoreCert.mock.instances[0];
  mockIoTCoreCertInstance.attachPolicy = mockIoTCoreCertAttachPolicy;
  mockIoTCoreCertInstance.arn = "arn";
  mockIoTCoreCertInstance.certificate = "pem";
  mockIoTCoreCertInstance.privateKey = "private-key";
}

function mockthingInstance(): void {
  const mockIoTCoreThingInstance = mockIoTCoreThing.mock.instances[0];
  mockIoTCoreThingInstance.attachCertificate = mockIoTCoreThingAttachCert;
  mockIoTCoreThingInstance.name = "name";
}
