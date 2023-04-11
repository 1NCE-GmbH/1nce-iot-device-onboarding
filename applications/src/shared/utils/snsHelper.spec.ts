import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { publishToSnsTopic } from "../utils/snsHelper";

console.log = jest.fn();

describe("SNS Helper", () => {
  const SNSClientMock = mockClient(SNSClient);

  beforeEach(() => {
    jest.resetAllMocks();
    SNSClientMock.reset();
  });

  describe("publishToSnsTopic", () => {
    it("should publish message to SNS topic", async () => {
      SNSClientMock.on(
        PublishCommand,
        { TopicArn: "topic-arn", Message: "message" },
      ).resolves({ MessageId: "message-id" });

      const result = await publishToSnsTopic("topic-arn", "message");

      expect(result).toStrictEqual({ MessageId: "message-id" });
      expect(console.log).toHaveBeenCalledWith("Publishing new message to SNS topic topic-arn");
    });
  });
});
