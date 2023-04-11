import { SQS, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import { buildSqsEvent } from "../test/sqs.fixture";
import { parseSimRetrievalSqsBody, sendSQSBatchMessages } from "../utils/sqsHelper";

console.log = jest.fn();
console.error = jest.fn();

describe("SQS Helper", () => {
  const SQSClientMock = mockClient(SQS);

  beforeEach(() => {
    jest.resetAllMocks();
    SQSClientMock.reset();
  });

  describe("sendSQSBatchMessages", () => {
    describe("When the SQS messages length is less than 10", () => {
      it("should call SQS client with correct parameters", async () => {
        const messages = [
          { Id: "1", MessageBody: "message-body", MessageGroupId: "1", MessageDeduplicationId: "1" },
          { Id: "2", MessageBody: "message-body", MessageGroupId: "2", MessageDeduplicationId: "2" },
          { Id: "3", MessageBody: "message-body", MessageGroupId: "3", MessageDeduplicationId: "3" },
          { Id: "4", MessageBody: "message-body", MessageGroupId: "4", MessageDeduplicationId: "4" },
          { Id: "5", MessageBody: "message-body", MessageGroupId: "5", MessageDeduplicationId: "5" },
        ];

        SQSClientMock.on(
          SendMessageBatchCommand,
          { QueueUrl: "QUEUE_URL", Entries: messages },
        ).resolves({ Failed: undefined });

        const result = await sendSQSBatchMessages("QUEUE_URL", messages);

        expect(result).toBeTruthy();
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending 5 SQS message(s) in chunks of 10");
        expect(console.log).toHaveBeenNthCalledWith(2, "Sending chunk from message 1 to 5", messages);
      });
    });

    describe("When the SQS messages length is more than 10", () => {
      it("should call SQS client with correct parameters", async () => {
        const messages = [
          { Id: "1", MessageBody: "message-body", MessageGroupId: "1", MessageDeduplicationId: "1" },
          { Id: "2", MessageBody: "message-body", MessageGroupId: "2", MessageDeduplicationId: "2" },
          { Id: "3", MessageBody: "message-body", MessageGroupId: "3", MessageDeduplicationId: "3" },
          { Id: "4", MessageBody: "message-body", MessageGroupId: "4", MessageDeduplicationId: "4" },
          { Id: "5", MessageBody: "message-body", MessageGroupId: "5", MessageDeduplicationId: "5" },
          { Id: "6", MessageBody: "message-body", MessageGroupId: "6", MessageDeduplicationId: "6" },
          { Id: "7", MessageBody: "message-body", MessageGroupId: "7", MessageDeduplicationId: "7" },
          { Id: "8", MessageBody: "message-body", MessageGroupId: "8", MessageDeduplicationId: "8" },
          { Id: "9", MessageBody: "message-body", MessageGroupId: "9", MessageDeduplicationId: "9" },
          { Id: "10", MessageBody: "message-body", MessageGroupId: "10", MessageDeduplicationId: "10" },
          { Id: "11", MessageBody: "message-body", MessageGroupId: "11", MessageDeduplicationId: "11" },
          { Id: "12", MessageBody: "message-body", MessageGroupId: "12", MessageDeduplicationId: "12" },
        ];

        SQSClientMock.on(
          SendMessageBatchCommand,
          { QueueUrl: "QUEUE_URL", Entries: messages.slice(0, 10) },
        ).resolves({ Failed: undefined });

        SQSClientMock.on(
          SendMessageBatchCommand,
          { QueueUrl: "QUEUE_URL", Entries: messages.slice(10, 12) },
        ).resolves({ Failed: undefined });

        const result = await sendSQSBatchMessages("QUEUE_URL", messages);

        expect(result).toBeTruthy();
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending 12 SQS message(s) in chunks of 10");
        expect(console.log).toHaveBeenNthCalledWith(2, "Sending chunk from message 1 to 10", messages.slice(0, 10));
        expect(console.log).toHaveBeenNthCalledWith(3, "Sending chunk from message 11 to 12", messages.slice(10, 12));
      });
    });

    describe("When the SQS messages returns failed messages", () => {
      it("should log all the failed messages", async () => {
        const messages = [
          { Id: "1", MessageBody: "message-body", MessageGroupId: "1", MessageDeduplicationId: "1" },
          { Id: "2", MessageBody: "message-body", MessageGroupId: "2", MessageDeduplicationId: "2" },
          { Id: "3", MessageBody: "message-body", MessageGroupId: "3", MessageDeduplicationId: "3" },
          { Id: "4", MessageBody: "message-body", MessageGroupId: "4", MessageDeduplicationId: "4" },
          { Id: "5", MessageBody: "message-body", MessageGroupId: "5", MessageDeduplicationId: "5" },
        ];
        const failedMessages = [
          { ...messages[2], SenderFault: false, Code: "ERROR CODE" },
        ];

        SQSClientMock.on(
          SendMessageBatchCommand,
          { QueueUrl: "QUEUE_URL", Entries: messages },
        ).resolves({ Failed: failedMessages });

        const result = await sendSQSBatchMessages("QUEUE_URL", messages);

        expect(result).toBeTruthy();
        expect(console.log).toHaveBeenNthCalledWith(1, "Sending 5 SQS message(s) in chunks of 10");
        expect(console.log).toHaveBeenNthCalledWith(2, "Sending chunk from message 1 to 5", messages);
        expect(console.error).toHaveBeenCalledWith("ERROR Failed to send messages to SQS queue", failedMessages);
      });
    });

    describe("When the SQS messages throws error", () => {
      it("should log all the failed messages", async () => {
        const messages = [
          { Id: "1", MessageBody: "message-body", MessageGroupId: "1", MessageDeduplicationId: "1" },
          { Id: "2", MessageBody: "message-body", MessageGroupId: "2", MessageDeduplicationId: "2" },
          { Id: "3", MessageBody: "message-body", MessageGroupId: "3", MessageDeduplicationId: "3" },
          { Id: "4", MessageBody: "message-body", MessageGroupId: "4", MessageDeduplicationId: "4" },
          { Id: "5", MessageBody: "message-body", MessageGroupId: "5", MessageDeduplicationId: "5" },
        ];

        SQSClientMock.on(
          SendMessageBatchCommand,
          { QueueUrl: "QUEUE_URL", Entries: messages },
        ).rejects("SQS error");

        try {
          await sendSQSBatchMessages("QUEUE_URL", messages);
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("SQS error"));
        }

        expect(console.log).toHaveBeenNthCalledWith(1, "Sending 5 SQS message(s) in chunks of 10");
        expect(console.log).toHaveBeenNthCalledWith(2, "Sending chunk from message 1 to 5", messages);
        expect(console.error).toHaveBeenCalledWith("Error sending messages to SQS", new Error("SQS error"));
      });
    });
  });

  describe("parseSimRetrievalSqsBody", () => {
    describe("when the iccid is missing", () => {
      it("should throw exception", () => {
        const event = buildSqsEvent(undefined, "10.0.0.0");

        try {
          parseSimRetrievalSqsBody(event.Records[0]);
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("No iccid found in the SQS message body"));
        }
      });
    });

    describe("when the ip is missing", () => {
      it("should throw exception", () => {
        const event = buildSqsEvent("123456789", undefined);

        try {
          parseSimRetrievalSqsBody(event.Records[0]);
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("No ip found in the SQS message body"));
        }
      });
    });

    describe("when the sqs record is valid", () => {
      it("should return an object with ip and iccid", () => {
        const event = buildSqsEvent("123456789", "10.0.0.0");
        const result = parseSimRetrievalSqsBody(event.Records[0]);

        expect(result).toStrictEqual({
          ip: "10.0.0.0",
          iccid: "123456789",
        });
      });
    });
  });
});
