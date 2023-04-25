process.env.SIM_CREATE_QUEUE_URL = "SIM_CREATE_QUEUE_URL";
process.env.SIM_DISABLE_QUEUE_URL = "SIM_DISABLE_QUEUE_URL";
process.env.SNS_FAILURE_SUMMARY_TOPIC = "SNS_FAILURE_SUMMARY_TOPIC";

import { mocked } from "jest-mock";
import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { getAllSims, getAuthToken } from "../shared/services/managementApiService";
import { getDbSims } from "../shared/services/simService";
import { SIM } from "../shared/types/sim";
import { sendSQSBatchMessages } from "../shared/utils/sqsHelper";
import { handler } from "./sim-retrieval";

jest.mock("../shared/services/managementApiService");
jest.mock("../shared/services/simService");
jest.mock("../shared/utils/sqsHelper");
jest.mock("../shared/services/errorHandlingService");

console.log = jest.fn();
console.error = jest.fn();
const mockGetAuthToken = mocked(getAuthToken);
const mockGetAllSims = mocked(getAllSims);
const mockgetDbSims = mocked(getDbSims);
const mockSendSQSBatchMessages = mocked(sendSQSBatchMessages);
const mockPublishErrorToSnsTopic = mocked(publishErrorToSnsTopic);

describe("SIM Retrieval", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("handler", () => {
    describe("When the auth token fails", () => {
      it("should throw exception", async () => {
        mockGetAuthToken.mockRejectedValueOnce(new Error("Auth Error"));
        mockPublishErrorToSnsTopic.mockResolvedValueOnce();

        await handler();

        expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM retrieve failed", new Error("Auth Error"));
        expect(console.error).toHaveBeenCalledWith("Error retrieving SIMs", new Error("Auth Error"));
      });
    });

    describe("When the get sims from API fails", () => {
      it("should throw exception", async () => {
        mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
        mockGetAllSims.mockRejectedValueOnce("API Error");
        mockPublishErrorToSnsTopic.mockResolvedValueOnce();

        await handler();

        expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM retrieve failed", "API Error");
        expect(console.error).toHaveBeenCalledWith("Error retrieving SIMs", "API Error");
      });
    });

    describe("When the get sims from database fails", () => {
      it("should throw exception", async () => {
        mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
        mockGetAllSims.mockResolvedValueOnce([
          new SIM({
            iccid: "1111111111",
            ip: "10.0.0.1",
            active: true,
            certificate: "certificate",
            certificateId: "cert-id",
            privateKey: "private_key",
          }),
        ]);
        mockgetDbSims.mockRejectedValueOnce(new Error("Database Error"));
        mockPublishErrorToSnsTopic.mockResolvedValueOnce();

        await handler();

        expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM retrieve failed", new Error("Database Error"));
        expect(console.error).toHaveBeenCalledWith("Error retrieving SIMs", new Error("Database Error"));
        expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 1");
      });
    });

    describe("When the API and database requests have proper responses", () => {
      describe("and the API and database have the same SIMs", () => {
        it("should not send messages to the SQS queues", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(0);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 1");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 1");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 0");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 0");
        });
      });

      describe("and the API returns new SIMs", () => {
        it("should send new SIMs messages to the SQS create queue", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(1);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_CREATE_QUEUE_URL", [
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 2");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 1");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 1");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 0");
        });
      });

      describe("and the API returns fewer SIMs than registered in the database", () => {
        it("should send messages to disable these SIMs into SQS disable queue", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "3333333333",
              ip: "10.0.0.3",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(1);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_DISABLE_QUEUE_URL", [
            new SIM({
              iccid: "3333333333",
              ip: "10.0.0.3",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 2");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 3");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 0");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 1");
        });
      });

      describe("and the API returns fewer SIMs than registered in the database but they are already disabled", () => {
        it("should NOT send messages to disable these SIMs", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "3333333333",
              ip: "10.0.0.3",
              active: false,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(0);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 2");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 3");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 0");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 0");
        });
      });

      describe("and the API returns SIM that is disabled in the database", () => {
        it("should send message to create disabled SIM", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: false,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(1);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_CREATE_QUEUE_URL", [
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 2");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 2");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 1");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 0");
        });
      });

      describe("and the API returns a new SIM and a missing SIM compared to the database", () => {
        it("should send messages to create and disable these SIMs into SQS queues", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "4444444444",
              ip: "10.0.0.4",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "2222222222",
              ip: "10.0.0.2",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
            new SIM({
              iccid: "3333333333",
              ip: "10.0.0.3",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(2);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_CREATE_QUEUE_URL", [
            new SIM({
              iccid: "4444444444",
              ip: "10.0.0.4",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_DISABLE_QUEUE_URL", [
            new SIM({
              iccid: "3333333333",
              ip: "10.0.0.3",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 3");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 3");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 1");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 1");
        });
      });

      describe("and fails sending SQS requests", () => {
        it("should log the error", async () => {
          mockGetAuthToken.mockResolvedValueOnce("JWT_TOKEN");
          mockGetAllSims.mockResolvedValueOnce([
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }),
          ]);
          mockgetDbSims.mockResolvedValueOnce([]);
          mockSendSQSBatchMessages.mockRejectedValueOnce("SQS error");
          mockPublishErrorToSnsTopic.mockResolvedValueOnce();

          await handler();

          expect(mockSendSQSBatchMessages).toHaveBeenCalledTimes(1);
          expect(mockSendSQSBatchMessages).toHaveBeenCalledWith("SIM_CREATE_QUEUE_URL", [
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "certificate",
              certificateId: "cert-id",
              privateKey: "private_key",
            }).buildSqsMessageEntry(),
          ]);
          expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith("SIM retrieve failed", new Error(JSON.stringify(["SQS error"])));
          expect(console.log).toHaveBeenCalledTimes(4);
          expect(console.log).toHaveBeenNthCalledWith(1, "SIMs returned by API: 1");
          expect(console.log).toHaveBeenNthCalledWith(2, "SIMs returned by database: 0");
          expect(console.log).toHaveBeenNthCalledWith(3, "SIMs to be created: 1");
          expect(console.log).toHaveBeenNthCalledWith(4, "SIMs to be disabled: 0");
          expect(console.error).toHaveBeenCalledTimes(1);
          expect(console.error).toHaveBeenNthCalledWith(1, "Error retrieving SIMs", new Error(JSON.stringify(["SQS error"])));
        });
      });
    });
  });
});
