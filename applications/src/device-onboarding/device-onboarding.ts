import axios from "axios";
import { type APIGatewayProxyEvent, type APIGatewayProxyResult, type Context } from "aws-lambda";
import { getDbSimByIp } from "../shared/services/simService";
import { NotFoundError } from "../shared/types/error";
import { type SIM } from "../shared/types/sim";
import { type IOnboardingResponse } from "../shared/types/onboarding";
import { ACCEPT_HEADER, CSV_DATA_TYPE, IP_HEADER, REMOVE_NEWLINE_REGEX } from "../shared/utils/utils";

const AMAZON_ROOTCA_URL = process.env.AMAZON_ROOTCA_URL as string;
const IOT_CORE_ENDPOINT_URL = process.env.IOT_CORE_ENDPOINT_URL as string;

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  try {
    const ipAddress = event.headers[IP_HEADER];
    if (!ipAddress) {
      throw new Error(`No ipAddress found in the header=${IP_HEADER}`);
    }

    const sim = await getDbSimByIp(ipAddress);
    if (!sim) {
      throw new NotFoundError(`Sim not found for IP=${ipAddress}`);
    }

    if (!sim.certificate || !sim.privateKey) {
      throw new NotFoundError(`Certificate or private key is missing for the device with the IP=${ipAddress}`);
    }

    if (!sim.active) {
      throw new NotFoundError(`Device with the IP=${ipAddress} is not active`);
    }
    const onboardingResponse = createOnboardingResponse(sim);

    if (event.headers[ACCEPT_HEADER] === CSV_DATA_TYPE) {
      const amazonRootCa = (await axios.get(AMAZON_ROOTCA_URL)).data;
      return {
        statusCode: 200,
        headers: {
          "content-type": CSV_DATA_TYPE,
        },
        body: jsonToCsv(onboardingResponse, amazonRootCa),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(onboardingResponse, null, 2),
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: error.message }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Unexpected error occurred", requestId: context.awsRequestId }, null, 2),
    };
  }
};

function createOnboardingResponse(sim: SIM): IOnboardingResponse {
  return {
    amazonRootCaUrl: AMAZON_ROOTCA_URL,
    certificate: sim.certificate,
    privateKey: sim.privateKey,
    iccid: sim.iccid,
    iotCoreEndpointUrl: IOT_CORE_ENDPOINT_URL,
  };
}

function jsonToCsv(onboardingResponse: IOnboardingResponse, amazonRootCa: string): string {
  const csvValues = [];
  csvValues.push(`"${onboardingResponse.iccid}"`);
  csvValues.push(`"${onboardingResponse.iotCoreEndpointUrl}"`);
  csvValues.push(`"${onboardingResponse.amazonRootCaUrl}"`);
  csvValues.push(`"${amazonRootCa.replace(REMOVE_NEWLINE_REGEX, "\\n")}"`);
  csvValues.push(`"${onboardingResponse.certificate.replace(REMOVE_NEWLINE_REGEX, "\\n")}"`);
  csvValues.push(`"${onboardingResponse.privateKey.replace(REMOVE_NEWLINE_REGEX, "\\n")}"`);

  return csvValues.join(",");
}
