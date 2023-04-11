process.env.SNS_FAILURE_SUMMARY_TOPIC = "SNS_FAILURE_SUMMARY_TOPIC";

import { mocked } from "jest-mock";
import { SIM } from "../types/sim";
import { publishToSnsTopic } from "../utils/snsHelper";
import { publishErrorToSnsTopic } from "./errorHandlingService";

jest.mock("../utils/snsHelper");

console.log = jest.fn();
console.error = jest.fn();
const mockPublishToSnsTopic = mocked(publishToSnsTopic);

const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("Error service", () => {
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

  describe("when SNS request fails", () => {
    describe("and the error is a Error instance", () => {
      it("should log the error", async () => {
        mockPublishToSnsTopic.mockRejectedValueOnce(new Error("SNS error"));

        await publishErrorToSnsTopic("Error description", new Error("SNS error"));

        expect(mockPublishToSnsTopic).toHaveBeenCalledTimes(1);
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_FAILURE_SUMMARY_TOPIC", JSON.stringify({
          timestamp: mockDate.getTime(),
          message: "SNS error",
        }));
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending error message to SNS topic", { timestamp: mockDate.getTime(), message: "SNS error" });
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error sending message to SNS failure topic", new Error("SNS error"));
      });
    });

    describe("and the error is a string", () => {
      it("should log the error", async () => {
        mockPublishToSnsTopic.mockRejectedValueOnce("SNS error");

        await publishErrorToSnsTopic("Error description", "SNS error");

        expect(mockPublishToSnsTopic).toHaveBeenCalledTimes(1);
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_FAILURE_SUMMARY_TOPIC", JSON.stringify({
          timestamp: mockDate.getTime(),
          message: "SNS error",
        }));
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending error message to SNS topic", { timestamp: mockDate.getTime(), message: "SNS error" });
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error sending message to SNS failure topic", "SNS error");
      });
    });
  });

  describe("when SNS request was successful", () => {
    describe("and the sim instance is undefined", () => {
      it("should send the message", async () => {
        mockPublishToSnsTopic.mockResolvedValueOnce({ $metadata: {} });

        await publishErrorToSnsTopic("Error description", new Error("SNS error"));

        expect(mockPublishToSnsTopic).toHaveBeenCalledTimes(1);
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_FAILURE_SUMMARY_TOPIC", JSON.stringify({
          timestamp: mockDate.getTime(),
          message: "SNS error",
        }));
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending error message to SNS topic", { timestamp: mockDate.getTime(), message: "SNS error" });
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });

    describe("and the sim instance is not undefined", () => {
      it("should send the message", async () => {
        mockPublishToSnsTopic.mockResolvedValueOnce({ $metadata: {} });

        await publishErrorToSnsTopic("Error description", new Error("SNS error"), new SIM({
          ip: "10.0.0.0",
          iccid: "123456789",
          active: true,
          certificate: "pem",
          privateKey: "private-key",
        }));

        expect(mockPublishToSnsTopic).toHaveBeenCalledTimes(1);
        expect(mockPublishToSnsTopic).toHaveBeenCalledWith("SNS_FAILURE_SUMMARY_TOPIC", JSON.stringify({
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: mockDate.getTime(),
          message: "Error description. Error: SNS error",
        }));
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending error message to SNS topic", {
          iccid: "123456789",
          ip: "10.0.0.0",
          timestamp: mockDate.getTime(),
          message: "Error description. Error: SNS error",
        });
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });
  });
});
