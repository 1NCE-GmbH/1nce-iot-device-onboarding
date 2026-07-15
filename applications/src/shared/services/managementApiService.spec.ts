process.env.MANAGEMENT_API_URL = "API_URL";
process.env.MANAGEMENT_API_CREDENTIALS_SECRET_ARN = "MANAGEMENT_API_CREDENTIALS_SECRET_ARN";

import { mocked } from "jest-mock";
import axios from "axios";
import { getAuthToken, getAllSims, resolveSimsPath } from "./managementApiService";
import { SIM } from "../types/sim";
import { retrieveJSONSecret } from "../utils/secretsManagerHelper";

jest.mock("axios");
jest.mock("../utils/secretsManagerHelper");

const mockPostAxios = mocked(axios.post);
const mockGetAxios = mocked(axios.get);
const mockRetrieveJSONSecret = mocked(retrieveJSONSecret);
console.log = jest.fn();
console.error = jest.fn();
const mockDate = new Date("2022-04-02T09:00:00.000Z");

describe("Management API Service", () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: mockDate.getTime(),
    });
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
          new SIM({ iccid: "1111111111", ip: "10.0.0.1", active: true, certificate: "", certificateId: "", privateKey: "" }),
          new SIM({ iccid: "2222222222", ip: "10.0.0.2", active: true, certificate: "", certificateId: "", privateKey: "" }),
          new SIM({ iccid: "3333333333", ip: "10.0.0.3", active: true, certificate: "", certificateId: "", privateKey: "" }),
          new SIM({ iccid: "4444444444", ip: "10.0.0.4", active: true, certificate: "", certificateId: "", privateKey: "" }),
          new SIM({ iccid: "5555555555", ip: "10.0.0.5", active: true, certificate: "", certificateId: "", privateKey: "" }),
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

describe("resolveSimsPath", () => {
  // C2 — v1 selects the v1 path. Validates: Requirements 2.2
  it("should return the v1 path when version is v1", () => {
    expect(resolveSimsPath("v1")).toEqual("/v1/sims");
  });

  // C1 — v2 selects the v2 path. Validates: Requirements 2.1
  it("should return the v2 path when version is v2", () => {
    expect(resolveSimsPath("v2")).toEqual("/v2/sims");
  });

  // C3 — absent version defaults to v1. Validates: Requirements 2.3, 1.2
  it("should default to the v1 path when version is undefined", () => {
    expect(resolveSimsPath(undefined)).toEqual("/v1/sims");
  });

  it("should default to the v1 path when version is an empty string", () => {
    expect(resolveSimsPath("")).toEqual("/v1/sims");
  });

  // C4 — unsupported version errors. Validates: Requirements 2.4
  it("should throw an error naming the invalid value for unsupported versions", () => {
    expect(() => resolveSimsPath("v3")).toThrow(new Error("Unsupported platform version: v3"));
  });
});

describe("getAllSims path selection", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, MANAGEMENT_API_URL: "API_URL", MANAGEMENT_API_CREDENTIALS_SECRET_ARN: "MANAGEMENT_API_CREDENTIALS_SECRET_ARN" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // C5 — mapping unchanged under v2. Validates: Requirements 3.2
  it("should request the v2 path and map sims identically to v1 when PLATFORM_VERSION is v2", async () => {
    process.env.PLATFORM_VERSION = "v2";
    const { getAllSims: getAllSimsV2 } = await import("./managementApiService");
    const axiosV2 = (await import("axios")).default;

    mocked(axiosV2.get).mockResolvedValueOnce({
      data: [
        { iccid: "1111111111", ip_address: "10.0.0.1" },
        { iccid: "2222222222", ip_address: "10.0.0.2" },
      ],
      headers: { "x-total-pages": 1 },
    });

    const result = await getAllSimsV2("JWT_TOKEN");

    expect(axiosV2.get).toHaveBeenCalledWith(
      "API_URL/v2/sims",
      expect.objectContaining({ headers: { Authorization: "Bearer JWT_TOKEN" } }),
    );
    expect(result).toHaveLength(2);
    expect(result.map((sim: SIM) => ({
      iccid: sim.iccid,
      ip: sim.ip,
      active: sim.active,
      certificate: sim.certificate,
      certificateId: sim.certificateId,
      privateKey: sim.privateKey,
    }))).toStrictEqual([
      { iccid: "1111111111", ip: "10.0.0.1", active: true, certificate: "", certificateId: "", privateKey: "" },
      { iccid: "2222222222", ip: "10.0.0.2", active: true, certificate: "", certificateId: "", privateKey: "" },
    ]);
  });

  // C2 — v1 selects the v1 path (via getAllSims). Validates: Requirements 2.2
  it("should request the v1 path when PLATFORM_VERSION is v1", async () => {
    process.env.PLATFORM_VERSION = "v1";
    const { getAllSims: getAllSimsV1 } = await import("./managementApiService");
    const axiosV1 = (await import("axios")).default;

    mocked(axiosV1.get).mockResolvedValueOnce({
      data: [{ iccid: "1111111111", ip_address: "10.0.0.1" }],
      headers: { "x-total-pages": 1 },
    });

    await getAllSimsV1("JWT_TOKEN");

    expect(axiosV1.get).toHaveBeenCalledWith(
      "API_URL/v1/sims",
      expect.objectContaining({ headers: { Authorization: "Bearer JWT_TOKEN" } }),
    );
  });
});
