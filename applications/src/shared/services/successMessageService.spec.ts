process.env.SNS_SUCCESS_SUMMARY_TOPIC = "SNS_SUCCESS_SUMMARY_TOPIC";

import { mocked } from "jest-mock";
import { SIM } from "../types/sim";
import { publishToMqtt } from "../utils/awsIotCoreHelper";
import { publishToSnsTopic } from "../utils/snsHelper";
import { publishRegistrationToMqtt, publishSuccessSummaryToSns } from "./successMessageService";

jest.mock("../utils/dynamoHelper");
jest.mock("../utils/awsIotCoreHelper");
jest.mock("../utils/snsHelper");

const mockPublishToMqtt = mocked(publishToMqtt);
const mockPublishToSnsTopic = mocked(publishToSnsTopic);

console.error = jest.fn();
console.log = jest.fn();

describe("Success Message Service", () => {
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

  describe("publishRegistrationToMqtt", () => {
    describe("when the MQTT publish fails", () => {
      it("should log the error message", async () => {
        const error = "Error publishing to MQTT topic";
        mockPublishToMqtt.mockRejectedValueOnce(error);

        await publishRegistrationToMqtt(new SIM({
          iccid: "123456789",
          ip: "10.0.0.0",
          active: true,
          certificate: "pem",
          privateKey: "private-key",
        }));

        const mqttMessage = {
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: 1648890000000,
          message: "enabled",
        };
        expect(mockPublishToMqtt).toHaveBeenCalledWith("registration", JSON.stringify(mqttMessage));
        expect(console.log).toHaveBeenCalledWith("Sending message to MQTT topic", mqttMessage);
        expect(console.error).toHaveBeenCalledWith("Error sending registration message to MQTT topic: registration", error);
      });
    });

    describe("when MQTT publish succeeds", () => {
      it("should not log any error message", async () => {
        mockPublishToMqtt.mockResolvedValueOnce({ $metadata: {} });

        await publishRegistrationToMqtt(new SIM({
          iccid: "123456789",
          ip: "10.0.0.0",
          active: true,
          certificate: "pem",
          privateKey: "private-key",
        }));

        const mqttMessage = {
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: 1648890000000,
          message: "enabled",
        };
        expect(mockPublishToMqtt).toHaveBeenCalledWith("registration", JSON.stringify(mqttMessage));
        expect(console.log).toHaveBeenCalledWith("Sending message to MQTT topic", mqttMessage);
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("publishSuccessSummaryToSns", () => {
    describe("when the SNS publish fails", () => {
      it("should log the error message", async () => {
        const error = "Error publishing to MQTT topic";
        mockPublishToSnsTopic.mockRejectedValueOnce(error);

        await publishSuccessSummaryToSns(new SIM({
          iccid: "123456789",
          ip: "10.0.0.0",
          active: true,
          certificate: "pem",
          privateKey: "private-key",
        }));

        const snsMessage = {
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: 1648890000000,
          message: "enabled",
        };
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_SUCCESS_SUMMARY_TOPIC", JSON.stringify(snsMessage));
        expect(console.log).toHaveBeenCalledWith("Sending message to SNS topic", snsMessage);
        expect(console.error).toHaveBeenCalledWith("Error sending success summary message to SNS topic: SNS_SUCCESS_SUMMARY_TOPIC", error);
      });
    });

    describe("when SNS publish succeeds", () => {
      it("should not log any error message", async () => {
        mockPublishToSnsTopic.mockResolvedValueOnce({ $metadata: {} });

        await publishSuccessSummaryToSns(new SIM({
          iccid: "123456789",
          ip: "10.0.0.0",
          active: true,
          certificate: "pem",
          privateKey: "private-key",
        }));

        const snsMessage = {
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: 1648890000000,
          message: "enabled",
        };
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_SUCCESS_SUMMARY_TOPIC", JSON.stringify(snsMessage));
        expect(console.log).toHaveBeenCalledWith("Sending message to SNS topic", snsMessage);
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });
  });
});
