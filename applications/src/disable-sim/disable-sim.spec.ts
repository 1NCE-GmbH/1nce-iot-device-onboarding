process.env.SIMS_TABLE = "SIMS_TABLE";

import { mocked } from "jest-mock";
import { handler } from "./disable-sim";
import { publishErrorToSnsTopic } from "../shared/services/errorHandlingService";
import { publishSuccessSummaryToSns } from "../shared/services/successMessageService";
import { disableSim } from "../shared/services/simService";
import { SIM } from "../shared/types/sim";
import { parseSimRetrievalSqsBody } from "../shared/utils/sqsHelper";
import { buildSqsEvent } from "../shared/test/sqs.fixture";

jest.mock("../shared/services/errorHandlingService");
jest.mock("../shared/services/successMessageService");
jest.mock("../shared/services/simService");
jest.mock("../shared/utils/sqsHelper");

const mockPublishErrorToSnsTopic = mocked(publishErrorToSnsTopic);
const mockPublishSuccessSummaryToSns = mocked(publishSuccessSummaryToSns);
const mockDisableSim = mocked(disableSim);
const mockParseSimRetrievalSqsBody = mocked(parseSimRetrievalSqsBody);

console.error = jest.fn();
console.log = jest.fn();
const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("Disable SIM", () => {
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

  const sim = new SIM({
    iccid: "123456789",
    ip: "10.0.0.0",
    createdTime: mockDate.toISOString(),
    updatedTime: mockDate.toISOString(),
    active: false,
    certificate: "pem",
    certificateId: "cert-id",
    privateKey: "private-key",
  });

  describe("when SQS event body is not JSON", () => {
    it("should log parsing error", async () => {
      mockParseSimRetrievalSqsBody.mockImplementation(() => {
        throw new Error("Parsing error");
      });
      const event = {
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
      };
      await handler(event);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE disabling SIM", new Error("Parsing error"), event.Records[0]);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when disable SIM throws an error", () => {
    it("should log disabling error", async () => {
      const error = "Error retrieving SIM";
      mockParseSimRetrievalSqsBody.mockReturnValue(sim);
      mockDisableSim.mockRejectedValueOnce(error);
      mockPublishErrorToSnsTopic.mockResolvedValueOnce();

      const event = buildSqsEvent("123456789", "10.0.0.0");
      await handler(event);

      expect(mockDisableSim).toHaveBeenCalledWith("10.0.0.0", "123456789");
      expect(mockPublishErrorToSnsTopic).toHaveBeenCalledWith(
        "SIM disable failed",
        error,
        undefined,
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenNthCalledWith(1, "FAILURE disabling SIM", error, event.Records[0]);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("when the creation process is completed sucessfully", () => {
    it("should log SIM created successfully", async () => {
      mockParseSimRetrievalSqsBody.mockReturnValue(sim);
      mockDisableSim.mockResolvedValueOnce(sim);
      mockPublishSuccessSummaryToSns.mockResolvedValueOnce();

      const event = buildSqsEvent("123456789", "10.0.0.0");
      await handler(event);

      expect(mockDisableSim).toHaveBeenCalledWith("10.0.0.0", "123456789");
      expect(mockPublishSuccessSummaryToSns).toHaveBeenCalledWith({
        iccid: "123456789",
        ip: "10.0.0.0",
        certificate: "pem",
        certificateId: "cert-id",
        privateKey: "private-key",
        active: false,
        createdTime: mockDate,
        updatedTime: mockDate,
      }, "SIM disabled");
      expect(console.error).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith("SUCCESS SIM disabled", sim);
    });
  });
});
