import axios from "axios";
import { retrieveJSONSecret } from "../utils/secretsManagerHelper";

process.env.AWS_SESSION_TOKEN = "AWS_SESSION_TOKEN";

console.log = jest.fn();
console.error = jest.fn();

const axiosGet = jest.spyOn(axios, "get");

describe("Secrets Manager Helper", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("retrieveJSONSecret", () => {
    describe("When the SecretString is undefined", () => {
      it("should throw an error", async () => {
        const expectedError = new Error("Secret value for id should not be undefined");
        axiosGet.mockResolvedValue({
          data: {
            SecretString: undefined,
          },
        });

        try {
          await retrieveJSONSecret("id");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(expectedError);
        }

        expect(axiosGet).toHaveBeenCalledWith(
          "http://localhost:2773/secretsmanager/get?secretId=id",
          { headers: { "X-Aws-Parameters-Secrets-Token": "AWS_SESSION_TOKEN" } },
        );
        expect(console.error).toHaveBeenCalledWith("Error retrieving secret from Secrets Manager", expectedError);
        expect(console.log).toHaveBeenCalledWith("Retrieving secret with id 'id'");
      });
    });

    describe("When the SecretString is invalid JSON", () => {
      it("should throw an error", async () => {
        const expectedError = new Error("Invalid JSON value: {invalid JSON}");
        axiosGet.mockResolvedValue({
          data: {
            SecretString: "{invalid JSON}",
          },
        });

        try {
          await retrieveJSONSecret("id");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(expectedError);
        }

        expect(axiosGet).toHaveBeenCalledWith(
          "http://localhost:2773/secretsmanager/get?secretId=id",
          { headers: { "X-Aws-Parameters-Secrets-Token": "AWS_SESSION_TOKEN" } },
        );
        expect(console.error).toHaveBeenCalledWith("Error retrieving secret from Secrets Manager", expectedError);
        expect(console.log).toHaveBeenCalledWith("Retrieving secret with id 'id'");
      });
    });

    describe("When the SecretString is valid JSON", () => {
      it("should throw an error", async () => {
        axiosGet.mockResolvedValue({
          data: {
            SecretString: "{\"key\":\"value\"}",
          },
        });

        const result = await retrieveJSONSecret("id");

        expect(axiosGet).toHaveBeenCalledWith(
          "http://localhost:2773/secretsmanager/get?secretId=id",
          { headers: { "X-Aws-Parameters-Secrets-Token": "AWS_SESSION_TOKEN" } },
        );
        expect(result).toStrictEqual({ key: "value" });
        expect(console.log).toHaveBeenCalledWith("Retrieving secret with id 'id'");
      });
    });

    describe("When the secrets manager call is rejected", () => {
      it("should throw an error", async () => {
        const expectedError = "Secrets Manager error";
        axiosGet.mockRejectedValueOnce(expectedError);

        try {
          await retrieveJSONSecret("id");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(expectedError);
        }

        expect(axiosGet).toHaveBeenCalledWith(
          "http://localhost:2773/secretsmanager/get?secretId=id",
          { headers: { "X-Aws-Parameters-Secrets-Token": "AWS_SESSION_TOKEN" } },
        );
        expect(console.error).toHaveBeenCalledWith("Error retrieving secret from Secrets Manager", expectedError);
        expect(console.log).toHaveBeenCalledWith("Retrieving secret with id 'id'");
      });
    });
  });
});
