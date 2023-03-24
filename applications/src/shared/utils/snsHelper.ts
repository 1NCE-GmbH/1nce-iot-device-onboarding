import { SNSClient, PublishCommand, type PublishCommandOutput } from "@aws-sdk/client-sns";

const MAIN_REGION = process.env.MAIN_REGION as string;
const iot = new SNSClient({ region: MAIN_REGION });

/**
 * Publish message to SNS topic
 * @param topicArn - SNS Topic ARN.
 * @param message - Message to send to the topic.
 */
export async function publishToSnsTopic(topicArn: string, message: string): Promise<PublishCommandOutput> {
  console.log(`Publishing new message to SNS topic ${topicArn}`);

  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: message,
  });

  return await iot.send(command);
}
