import { type SIM } from "../types/sim";
import { publishToSnsTopic } from "../utils/snsHelper";

const SNS_FAILURE_SUMMARY_TOPIC = process.env.SNS_FAILURE_SUMMARY_TOPIC as string;

export async function publishErrorToSnsTopic(error: unknown, sim?: SIM): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : error as string;
    let snsMessage = {
      timestamp: new Date().valueOf(),
      message: errorMessage,
    };

    if (sim) {
      snsMessage = sim.toMessage(errorMessage);
    }

    console.log("Sending error message to SNS topic", snsMessage);
    await publishToSnsTopic(SNS_FAILURE_SUMMARY_TOPIC, JSON.stringify(snsMessage));
  } catch (error) {
    console.error("Error sending message to SNS failure topic", error);
  }
}
