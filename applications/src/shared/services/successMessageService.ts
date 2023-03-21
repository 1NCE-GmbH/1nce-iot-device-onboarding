import { type SIM } from "../types/sim";
import { publishToMqtt } from "../utils/awsIotCoreHelper";
import { publishToSnsTopic } from "../utils/snsHelper";

const SNS_SUCCESS_SUMMARY_TOPIC = process.env.SNS_SUCCESS_SUMMARY_TOPIC as string;

const MQTT_REGISTRATION_TOPIC = "registration";
const SUCCESS_SUMMARY_MESSAGE = "enabled";

export async function publishRegistrationToMqtt(sim: SIM): Promise<void> {
  try {
    const message = sim.toMessage(SUCCESS_SUMMARY_MESSAGE);

    console.log("Sending message to MQTT topic", message);
    await publishToMqtt(MQTT_REGISTRATION_TOPIC, JSON.stringify(message));
  } catch (error) {
    console.error(`Error sending registration message to MQTT topic: ${MQTT_REGISTRATION_TOPIC}`, error);
  }
}

export async function publishSuccessSummaryToSns(sim: SIM): Promise<void> {
  try {
    const message = sim.toMessage(SUCCESS_SUMMARY_MESSAGE);

    console.log("Sending message to SNS topic", message);
    await publishToSnsTopic(SNS_SUCCESS_SUMMARY_TOPIC, JSON.stringify(message));
  } catch (error) {
    console.error(`Error sending success summary message to SNS topic: ${SNS_SUCCESS_SUMMARY_TOPIC}`, error);
  }
}
