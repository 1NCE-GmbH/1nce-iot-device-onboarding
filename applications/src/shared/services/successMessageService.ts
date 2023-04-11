import { type SIM } from "../types/sim";
import { publishToMqtt } from "../utils/awsIotCoreHelper";
import { publishToSnsTopic } from "../utils/snsHelper";

const SNS_SUCCESS_SUMMARY_TOPIC = process.env.SNS_SUCCESS_SUMMARY_TOPIC as string;
const MQTT_REGISTRATION_TOPIC = "registration";

export async function publishRegistrationToMqtt(sim: SIM, message: string): Promise<void> {
  try {
    const mqttMessage = sim.toMessage(message);

    console.log("Sending message to MQTT topic", mqttMessage);
    await publishToMqtt(MQTT_REGISTRATION_TOPIC, JSON.stringify(mqttMessage));
  } catch (error) {
    console.error(`Error sending registration message to MQTT topic: ${MQTT_REGISTRATION_TOPIC}`, error);
  }
}

export async function publishSuccessSummaryToSns(sim: SIM, message: string): Promise<void> {
  try {
    const snsMessage = sim.toMessage(message);

    console.log("Sending message to SNS topic", snsMessage);
    await publishToSnsTopic(SNS_SUCCESS_SUMMARY_TOPIC, JSON.stringify(snsMessage));
  } catch (error) {
    console.error(`Error sending success summary message to SNS topic: ${SNS_SUCCESS_SUMMARY_TOPIC}`, error);
  }
}
