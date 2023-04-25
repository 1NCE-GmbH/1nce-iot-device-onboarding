import axios from "axios";
import { SIM, type SimPerPageResults, type ISimBss } from "../types/sim";
import { retrieveJSONSecret } from "../utils/secretsManagerHelper";

const MANAGEMENT_API_URL = process.env.MANAGEMENT_API_URL as string;
const MANAGEMENT_API_CREDENTIALS_SECRET_ARN = process.env.MANAGEMENT_API_CREDENTIALS_SECRET_ARN as string;
const PAGE_SIZE = parseInt(process.env.PAGE_SIZE as string ?? 100);

interface APICredentials {
  username: string;
  password: string;
}

export async function getAuthToken(): Promise<string> {
  try {
    const { username, password } = await getApiCredentials();

    console.log(`Calling auth endpoint with user ${username}`);
    const basicAuth = `${username}:${password}`;
    const response = await axios.post(
      `${MANAGEMENT_API_URL}/oauth/token`,
      { grant_type: "client_credentials" },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(basicAuth).toString("base64")}`,
        },
      },
    );

    return response.data.access_token;
  } catch (error: any) {
    console.error("FAILURE calling management api auth endpoint", error);

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Error during authentication request");
  }
}

export async function getAllSims(authToken: string): Promise<SIM[]> {
  let simList: SIM[] = [];
  let currentPage = 1;

  while (true) {
    const sims = await getSimsPerPage(authToken, currentPage, PAGE_SIZE);
    simList = simList.concat(sims.results);

    if (sims.totalPages === currentPage) {
      break;
    }
    currentPage++;
  }

  return simList;
}

async function getSimsPerPage(authToken: string, page: number, pageSize: number): Promise<SimPerPageResults> {
  try {
    console.log(`Retrieving SIMs. Page: ${page}`);
    const response = await axios.get(`${MANAGEMENT_API_URL}/v1/sims`, {
      params: { page, pageSize },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return {
      results: response.data.map((simData: ISimBss) => new SIM({
        ...simData,
        ip: simData.ip_address,
        active: true,
        certificate: "",
        certificateId: "",
        privateKey: "",
      })),
      totalPages: parseInt(response.headers["x-total-pages"]),
    };
  } catch (error) {
    console.error("FAILURE calling management api sims endpoint", error);

    throw new Error("Error retrieving SIMs from API");
  }
}

async function getApiCredentials(): Promise<APICredentials> {
  const apiCredentials = await retrieveJSONSecret(MANAGEMENT_API_CREDENTIALS_SECRET_ARN);
  const { username, password } = apiCredentials;

  if (!username || !password) {
    throw new Error(`Username or password not found in secret ${MANAGEMENT_API_CREDENTIALS_SECRET_ARN}`);
  }

  return { username, password };
}
