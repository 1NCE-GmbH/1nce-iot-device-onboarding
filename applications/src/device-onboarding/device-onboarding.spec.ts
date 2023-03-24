process.env.AMAZON_ROOTCA_URL = "AMAZON_ROOTCA_URL";
process.env.IOT_CORE_ENDPOINT_URL = "IOT_CORE_ENDPOINT_URL";

import { mocked } from "jest-mock";
import { getDbSimByIp } from "../shared/services/simService";
import { SIM } from "../shared/types/sim";
import { handler } from "./device-onboarding";
import {
  getSampleContext,
  getSampleEvent,
} from "../shared/test/apiGateway.fixtures";
import axios from "axios";

jest.mock("../shared/services/simService");

console.error = jest.fn();
const mockGetDbSimByIp = mocked(getDbSimByIp);

const axiosGet = jest.spyOn(axios, "get");

describe("Device Onboarding", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {});

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("handler", () => {
    describe("When IP_HEADER is missing in the event", () => {
      it("should throw 500 error", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify(
            {
              message: "Unexpected error occurred",
              requestId: "string",
            },
            null,
            2,
          ),
          statusCode: 500,
        });
      });
    });

    describe("When error is thrown during db request", () => {
      it("should throw 500 error", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        sampleEvent.headers = {
          ...sampleEvent.headers,
          "onboarding-ip": "192.168.0.1",
        };
        mockGetDbSimByIp.mockRejectedValue("ERROR");
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify(
            {
              message: "Unexpected error occurred",
              requestId: "string",
            },
            null,
            2,
          ),
          statusCode: 500,
        });
      });
    });

    describe("When Sim is not found in the db", () => {
      it("should return 404 not found error response", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        sampleEvent.headers = {
          ...sampleEvent.headers,
          "onboarding-ip": "192.168.0.1",
        };
        mockGetDbSimByIp.mockResolvedValueOnce(undefined);
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify({
            message: "Sim not found for IP=192.168.0.1",
          }),
          statusCode: 404,
        });
      });
    });

    describe("When Sim is missing certificate", () => {
      it("should return 404 not found error response", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        sampleEvent.headers = {
          ...sampleEvent.headers,
          "onboarding-ip": "192.168.0.1",
        };
        mockGetDbSimByIp.mockResolvedValueOnce(
          ({
            iccid: "1111111111",
            ip: "10.0.0.1",
            active: true,
          } as any as SIM));
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify({
            message: "Certificate or private key is missing for the device with the IP=192.168.0.1",
          }),
          statusCode: 404,
        });
      });
    });

    describe("When Sim is not active", () => {
      it("should return 404 not found error response", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        sampleEvent.headers = {
          ...sampleEvent.headers,
          "onboarding-ip": "192.168.0.1",
        };
        mockGetDbSimByIp.mockResolvedValueOnce(
          new SIM({
            iccid: "1111111111",
            ip: "10.0.0.1",
            active: false,
            certificate: "aa",
            privateKey: "PK",
          }));
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify({
            message: "Device with the IP=192.168.0.1 is not active",
          }),
          statusCode: 404,
        });
      });
    });

    describe("When sim certificates are retrieved successfully", () => {
      it("should return 200 code with response body", async () => {
        const sampleEvent = getSampleEvent();
        const sampleContext = getSampleContext();
        sampleEvent.headers = {
          ...sampleEvent.headers,
          "onboarding-ip": "192.168.0.1",
        };
        mockGetDbSimByIp.mockResolvedValueOnce(
          new SIM({
            iccid: "1111111111",
            ip: "10.0.0.1",
            active: true,
            certificate: "aa",
            privateKey: "PK",
          }));
        const result = await handler(sampleEvent, sampleContext);
        expect(result).toEqual({
          body: JSON.stringify({
            amazonRootCaUrl: "AMAZON_ROOTCA_URL",
            certificate: "aa",
            privateKey: "PK",
            iccid: "1111111111",
            iotCoreEndpointUrl: "IOT_CORE_ENDPOINT_URL",
          }, null, 2),
          statusCode: 200,
        });
        expect(mockGetDbSimByIp).toHaveBeenCalledWith("192.168.0.1");
      });

      describe("and request has accept header with the text/csv value", () => {
        it("should return 200 code with response body", async () => {
          const sampleEvent = getSampleEvent();
          const sampleContext = getSampleContext();
          sampleEvent.headers = {
            ...sampleEvent.headers,
            "onboarding-ip": "192.168.0.1",
            Accept: "text/csv",
          };
          axiosGet.mockReturnValue(Promise.resolve({ status: 201, data: "AMZ_CERTIFICATE_DATA" }));
          mockGetDbSimByIp.mockResolvedValueOnce(
            new SIM({
              iccid: "1111111111",
              ip: "10.0.0.1",
              active: true,
              certificate: "aa",
              privateKey: "PK",
            }));
          const result = await handler(sampleEvent, sampleContext);
          expect(result).toEqual({
            body: "\"1111111111\",\"IOT_CORE_ENDPOINT_URL\",\"AMAZON_ROOTCA_URL\",\"AMZ_CERTIFICATE_DATA\",\"aa\",\"PK\"",
            statusCode: 200,
            headers: { "content-type": "text/csv" },
          });
          expect(axiosGet).toHaveBeenCalledWith("AMAZON_ROOTCA_URL");
        });
      });
    });
  });
});
