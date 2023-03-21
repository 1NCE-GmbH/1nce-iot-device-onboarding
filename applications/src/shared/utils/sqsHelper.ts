import { SQS, SendMessageBatchCommand, type SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";

const SQS_VERSION = "2012-11-05";
const MAIN_REGION = process.env.MAIN_REGION as string;

const sqs = new SQS({ apiVersion: SQS_VERSION, region: MAIN_REGION });

/**
 * Send a SQS messages in chunks of 10 messages (max allowed) to a given queue
 * @param queueUrl - The URL of the Amazon SQS queue to which a message is sent.
 * @param messages - The SQS messages
 */
export async function sendSQSBatchMessages(queueUrl: string, messages: SendMessageBatchRequestEntry[]): Promise<boolean> {
  const chunkSize = 10;
  console.log(`Sending ${messages.length} SQS message(s) in chunks of ${chunkSize}`);

  for (let i = 0; i < messages.length; i += chunkSize) {
    const messagesChunk = messages.slice(i, i + chunkSize);

    console.log(`Sending chunk from message ${i + 1} to ${i + messagesChunk.length}`, messagesChunk);
    await sendMessagesToSQS(queueUrl, messagesChunk);
  }

  return true;
}

async function sendMessagesToSQS(queueUrl: string, messages: SendMessageBatchRequestEntry[]): Promise<void> {
  try {
    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: messages,
    });
    const result = await sqs.send(command);
    if (result.Failed) {
      console.error("ERROR Failed to send messages to SQS queue", result.Failed);
    }
  } catch (error) {
    console.error("Error sending messages to SQS", error);
    throw error;
  }
}
