process.env.MANAGEMENT_API_URL = "API_URL";
process.env.MANAGEMENT_API_CREDENTIALS_SECRET_ARN = "MANAGEMENT_API_CREDENTIALS_SECRET_ARN";

import { mocked } from "jest-mock";
import axios from "axios";
import { getAuthToken, getAllSims } from "./managementApiService";
import { SIM } from "../types/sim";
import { retrieveJSONSecret } from "../utils/secretsManagerHelper";

jest.mock("axios");
jest.mock("../utils/secretsManagerHelper");

const mockPostAxios = mocked(axios.post);
const mockGetAxios = mocked(axios.get);
const mockRetrieveJSONSecret = mocked(retrieveJSONSecret);
console.log = jest.fn();
console.error = jest.fn();

describe("Management API Service", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 1, 1));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getAuthToken", () => {
    describe("when the management API returns valid response", () => {
      it("should return user auth token", async () => {
        mockRetrieveJSONSecret.mockResolvedValueOnce({ username: "API_USERNAME", password: "API_PASSWORD" });
        mockPostAxios.mockResolvedValueOnce({
          data: { access_token: "JWT_TOKEN" },
        });

        const result = await getAuthToken();

        expect(result).toEqual("JWT_TOKEN");
        expect(mockPostAxios).toHaveBeenCalledWith(
          "API_URL/oauth/token",
          { grant_type: "client_credentials" },
          { headers: { Authorization: "Basic QVBJX1VTRVJOQU1FOkFQSV9QQVNTV09SRA==" } },
        );
        expect(console.log).toHaveBeenCalledWith("Calling auth endpoint with user API_USERNAME");
      });
    });

    describe("when the secrets manager doesn't have valid credentials", () => {
      describe("and username is missing", () => {
        it("should log and throw an error", async () => {
          mockRetrieveJSONSecret.mockResolvedValueOnce({ password: "API_PASSWORD" });
          mockPostAxios.mockRejectedValueOnce("API error");
          const expectedError = new Error("Username or password not found in secret MANAGEMENT_API_CREDENTIALS_SECRET_ARN");

          try {
            await getAuthToken();
            fail("Test should throw error");
          } catch (error) {
            expect(error).toStrictEqual(new Error("Error during authentication request"));
          }

          expect(mockRetrieveJSONSecret).toHaveBeenCalledWith("MANAGEMENT_API_CREDENTIALS_SECRET_ARN");
          expect(console.error).toHaveBeenCalledWith("FAILURE calling management api auth endpoint", expectedError);
        });
      });

      describe("and password is missing", () => {
        it("should log and throw an error", async () => {
          mockRetrieveJSONSecret.mockResolvedValueOnce({ username: "API_USERNAME" });
          mockPostAxios.mockRejectedValueOnce("API error");
          const expectedError = new Error("Username or password not found in secret MANAGEMENT_API_CREDENTIALS_SECRET_ARN");

          try {
            await getAuthToken();
            fail("Test should throw error");
          } catch (error) {
            expect(error).toStrictEqual(new Error("Error during authentication request"));
          }

          expect(mockRetrieveJSONSecret).toHaveBeenCalledWith("MANAGEMENT_API_CREDENTIALS_SECRET_ARN");
          expect(console.error).toHaveBeenCalledWith("FAILURE calling management api auth endpoint", expectedError);
        });
      });
    });

    describe("when the management API returns error response", () => {
      it("should return user auth token", async () => {
        mockRetrieveJSONSecret.mockResolvedValueOnce({ username: "API_USERNAME", password: "API_PASSWORD" });

        const requestError = {
          response: {
            data: { message: "Incorrect username or password" },
          },
        };
        mockPostAxios.mockRejectedValueOnce(requestError);

        try {
          await getAuthToken();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("Incorrect username or password"));
        }

        expect(mockPostAxios).toHaveBeenCalledWith(
          "API_URL/oauth/token",
          { grant_type: "client_credentials" },
          { headers: { Authorization: "Basic QVBJX1VTRVJOQU1FOkFQSV9QQVNTV09SRA==" } },
        );
        expect(console.error).toHaveBeenCalledWith("FAILURE calling management api auth endpoint", requestError);
      });
    });
  });

  describe("getAllSims", () => {
    describe("when the management API returns valid responses", () => {
      it("should return user auth token", async () => {
        mockGetAxios.mockResolvedValueOnce({
          data: [
            { iccid: "1111111111", ip_address: "10.0.0.1" },
            { iccid: "2222222222", ip_address: "10.0.0.2" },
            { iccid: "3333333333", ip_address: "10.0.0.3" },
          ],
          headers: {
            "x-total-pages": 2,
          },
        });
        mockGetAxios.mockResolvedValueOnce({
          data: [
            { iccid: "4444444444", ip_address: "10.0.0.4" },
            { iccid: "5555555555", ip_address: "10.0.0.5" },
          ],
          headers: {
            "x-total-pages": 2,
          },
        });

        const result = await getAllSims("JWT_TOKEN");

        expect(result).toStrictEqual([
          new SIM({ iccid: "1111111111", ip: "10.0.0.1", active: true, certificate: "", privateKey: "" }),
          new SIM({ iccid: "2222222222", ip: "10.0.0.2", active: true, certificate: "", privateKey: "" }),
          new SIM({ iccid: "3333333333", ip: "10.0.0.3", active: true, certificate: "", privateKey: "" }),
          new SIM({ iccid: "4444444444", ip: "10.0.0.4", active: true, certificate: "", privateKey: "" }),
          new SIM({ iccid: "5555555555", ip: "10.0.0.5", active: true, certificate: "", privateKey: "" }),
        ]);
        expect(mockGetAxios).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenNthCalledWith(1, "Retrieving SIMs. Page: 1");
        expect(console.log).toHaveBeenNthCalledWith(2, "Retrieving SIMs. Page: 2");
      });
    });

    describe("when the management API returns error response", () => {
      it("should return user auth token", async () => {
        mockGetAxios.mockResolvedValueOnce({
          data: [
            { iccid: "1111111111" },
            { iccid: "2222222222" },
            { iccid: "3333333333" },
          ],
          headers: {
            "x-total-pages": 2,
          },
        });
        mockGetAxios.mockRejectedValueOnce("API error");

        try {
          await getAllSims("JWT_TOKEN");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error("Error retrieving SIMs from API"));
        }

        expect(mockGetAxios).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenNthCalledWith(1, "Retrieving SIMs. Page: 1");
        expect(console.log).toHaveBeenNthCalledWith(2, "Retrieving SIMs. Page: 2");
        expect(console.error).toHaveBeenCalledWith("FAILURE calling management api sims endpoint", "API error");
      });
    });
  });
});
