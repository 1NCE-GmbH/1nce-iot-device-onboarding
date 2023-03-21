import { mocked } from "jest-mock";
import { attachPolicyToCert, generateCertificate } from "../utils/awsIotCoreHelper";
import { IoTCoreCertificate } from "./iotCoreCertificate";

jest.mock("../utils/awsIotCoreHelper");

const mockGenerateCertificate = mocked(generateCertificate);
const mockAttachPolicyToCert = mocked(attachPolicyToCert);

const iotCoreCertificate = new IoTCoreCertificate({
  id: "id",
  arn: "arn",
  pem: "pem",
  privateKey: "private-key",
});

describe("IoT Core Certificate", () => {
  describe("constructor", () => {
    it("should build IoT Core Certificate instance", async () => {
      const result = new IoTCoreCertificate({
        id: "id",
        arn: "arn",
        pem: "pem",
        privateKey: "private-key",
      });

      expect(result.id).toStrictEqual("id");
      expect(result.arn).toStrictEqual("arn");
      expect(result.certificate).toStrictEqual("pem");
      expect(result.privateKey).toStrictEqual("private-key");
    });
  });

  describe("attachPolicy", () => {
    describe("when certificate is not properly attached to policy", () => {
      it("should return false", async () => {
        const error = "Error creating certificate";
        mockAttachPolicyToCert.mockRejectedValueOnce(error);

        try {
          await iotCoreCertificate.attachPolicy("policy-name");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockAttachPolicyToCert).toHaveBeenCalledWith("policy-name", iotCoreCertificate.arn);
      });
    });

    describe("when certificate is created", () => {
      it("should return false", async () => {
        mockAttachPolicyToCert.mockResolvedValueOnce({ $metadata: {} });

        await iotCoreCertificate.attachPolicy("policy-name");

        expect(mockAttachPolicyToCert).toHaveBeenCalledWith("policy-name", iotCoreCertificate.arn);
      });
    });
  });

  describe("create", () => {
    describe("when certificate is not properly created", () => {
      it("should return false", async () => {
        const error = "Error creating certificate";
        mockGenerateCertificate.mockRejectedValueOnce(error);

        try {
          await IoTCoreCertificate.create();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockGenerateCertificate).toHaveBeenCalled();
      });
    });

    describe("when certificate is created", () => {
      it("should return false", async () => {
        mockGenerateCertificate.mockResolvedValueOnce({
          id: "id",
          arn: "arn",
          pem: "pem",
          privateKey: "private-key",
        });

        const result = await IoTCoreCertificate.create();

        expect(result.id).toStrictEqual("id");
        expect(result.arn).toStrictEqual("arn");
        expect(result.certificate).toStrictEqual("pem");
        expect(result.privateKey).toStrictEqual("private-key");
        expect(mockGenerateCertificate).toHaveBeenCalled();
      });
    });
  });
});
