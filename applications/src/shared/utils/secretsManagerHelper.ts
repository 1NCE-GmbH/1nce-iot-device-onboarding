import axios, { type AxiosRequestConfig } from "axios";

const AWS_SECRETS_URL = "http://localhost:2773/secretsmanager/get";

/**
 * Retrieve and transform secret as JSON
 * @param id - Secret ID
 */
export async function retrieveJSONSecret(id: string): Promise<any> {
  try {
    console.log(`Retrieving secret with id '${id}'`);
    const config: AxiosRequestConfig = {
      headers: {
        "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
      },
    };
    const result = await axios.get(`${AWS_SECRETS_URL}?secretId=${id}`, config);

    if (!result.data.SecretString) {
      throw new Error(`Secret value for ${id} should not be undefined`);
    }

    return convertToJSON(result.data.SecretString);
  } catch (error) {
    console.error("Error retrieving secret from Secrets Manager", error);
    throw error;
  }
}

function convertToJSON(secret: string): any {
  try {
    return JSON.parse(secret);
  } catch (error) {
    throw new Error(`Invalid JSON value: ${secret}`);
  }
}
