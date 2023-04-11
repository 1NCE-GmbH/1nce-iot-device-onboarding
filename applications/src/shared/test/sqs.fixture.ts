import { type SQSEvent } from "aws-lambda";

export function buildSqsEvent(iccid?: string, ip?: string): SQSEvent {
  return {
    Records: [
      {
        messageId: "id",
        body: JSON.stringify({ iccid, ip }),
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
}
