import {
  IoTClient,
  CreateKeysAndCertificateCommand,
  DeleteCertificateCommand,
  AttachPolicyCommand,
  CreateThingCommand,
  DeleteThingCommand,
  AttachThingPrincipalCommand,
  UpdateCertificateCommand,
  CertificateStatus,
  DetachPolicyCommand,
  DetachThingPrincipalCommand,
} from "@aws-sdk/client-iot";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { mockClient } from "aws-sdk-client-mock";
import {
  generateCertificate,
  deleteCertificate,
  attachPolicyToCert,
  createThing,
  deleteThing,
  attachCertToThing,
  publishToMqtt,
  disableCertificate,
  detachPolicyFromCert,
  detachCertFromThing,
} from "../utils/awsIotCoreHelper";

console.log = jest.fn();

describe("AWS IoT Core Helper", () => {
  const IoTClientMock = mockClient(IoTClient);
  const IoTDataPlaneClientMock = mockClient(IoTDataPlaneClient);

  beforeEach(() => {
    jest.resetAllMocks();
    IoTClientMock.reset();
    IoTDataPlaneClientMock.reset();
  });

  describe("generateCertificate", () => {
    describe("when the certificate is generated", () => {
      it("should return certificate information", async () => {
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves({
          certificateId: "cert-id",
          certificateArn: "cert-arn",
          certificatePem: "cert-pem",
          keyPair: { PrivateKey: "private-key" },
        });

        const result = await generateCertificate();

        expect(result).toStrictEqual({
          id: "cert-id",
          arn: "cert-arn",
          pem: "cert-pem",
          privateKey: "private-key",
        });
        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });

    describe("when the certificate response is missing certificate id", () => {
      it("should throw an error", async () => {
        const resultMock = {
          certificateId: undefined,
          certificateArn: "cert-arn",
          certificatePem: "cert-pem",
          keyPair: { PrivateKey: "private-key" },
        };
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves(resultMock);

        try {
          await generateCertificate();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Certificate not generated: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });

    describe("when the certificate response is missing certificate arn", () => {
      it("should throw an error", async () => {
        const resultMock = {
          certificateId: "cert-id",
          certificateArn: undefined,
          certificatePem: "cert-pem",
          keyPair: { PrivateKey: "private-key" },
        };
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves(resultMock);

        try {
          await generateCertificate();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Certificate not generated: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });

    describe("when the certificate response is missing certificate pem", () => {
      it("should throw an error", async () => {
        const resultMock = {
          certificateId: "cert-id",
          certificateArn: "cert-arn",
          certificatePem: undefined,
          keyPair: { PrivateKey: "private-key" },
        };
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves(resultMock);

        try {
          await generateCertificate();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Certificate not generated: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });

    describe("when the certificate response is missing key pair", () => {
      it("should throw an error", async () => {
        const resultMock = {
          certificateId: "cert-id",
          certificateArn: "cert-arn",
          certificatePem: "cert-pem",
          keyPair: undefined,
        };
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves(resultMock);

        try {
          await generateCertificate();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Certificate not generated: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });

    describe("when the certificate response is missing private key", () => {
      it("should throw an error", async () => {
        const resultMock = {
          certificateId: "cert-id",
          certificateArn: "cert-arn",
          certificatePem: "cert-pem",
          keyPair: { PrivateKey: undefined },
        };
        IoTClientMock.on(
          CreateKeysAndCertificateCommand,
          { setAsActive: true },
        ).resolves(resultMock);

        try {
          await generateCertificate();
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Certificate not generated: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating new certificate");
      });
    });
  });

  describe("disableCertificate", () => {
    it("should return disable result", async () => {
      IoTClientMock.on(
        UpdateCertificateCommand,
        {
          certificateId: "cert-id",
          newStatus: CertificateStatus.INACTIVE,
        },
      ).resolves({ $metadata: {} });

      const result = await disableCertificate("cert-id");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Disabling certificate with id: cert-id");
    });
  });

  describe("deleteCertificate", () => {
    it("should return deletion result", async () => {
      IoTClientMock.on(
        DeleteCertificateCommand,
        { certificateId: "certificate-id" },
      ).resolves({ $metadata: {} });

      const result = await deleteCertificate("certificate-id");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Deleting certificate with id: certificate-id");
    });
  });

  describe("attachPolicyToCert", () => {
    it("should return attach result", async () => {
      IoTClientMock.on(
        AttachPolicyCommand,
        { policyName: "policy-name", target: "certificate-arn" },
      ).resolves({ $metadata: {} });

      const result = await attachPolicyToCert("policy-name", "certificate-arn");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Attaching policy policy-name to certificate certificate-arn");
    });
  });

  describe("detachPolicyFromCert", () => {
    it("should return detach result", async () => {
      IoTClientMock.on(
        DetachPolicyCommand,
        { policyName: "policy-name", target: "certificate-arn" },
      ).resolves({ $metadata: {} });

      const result = await detachPolicyFromCert("policy-name", "certificate-arn");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Detaching policy policy-name from certificate certificate-arn");
    });
  });

  describe("createThing", () => {
    describe("when the thing is created", () => {
      it("should return thing information", async () => {
        IoTClientMock.on(
          CreateThingCommand,
          {
            thingName: "1111111111",
            attributePayload: { attributes: { ICCID: "1111111111" } },
          },
        ).resolves({ thingName: "thing-name" });

        const result = await createThing("1111111111");

        expect(result).toStrictEqual({
          name: "thing-name",
        });
        expect(console.log).toHaveBeenCalledWith("Creating thing for the SIM iccid 1111111111");
      });
    });

    describe("when the thing response is missing thing name", () => {
      it("should throw an error", async () => {
        const resultMock = {};
        IoTClientMock.on(
          CreateThingCommand,
          {
            thingName: "1111111111",
            attributePayload: { attributes: { ICCID: "1111111111" } },
          },
        ).resolves(resultMock);

        try {
          await createThing("1111111111");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(new Error(`Thing not created for the device ICCID 1111111111: ${JSON.stringify(resultMock)}`));
        }

        expect(console.log).toHaveBeenCalledWith("Creating thing for the SIM iccid 1111111111");
      });
    });
  });

  describe("deleteThing", () => {
    it("should return deletion result", async () => {
      IoTClientMock.on(
        DeleteThingCommand,
        { thingName: "thing-name" },
      ).resolves({ $metadata: {} });

      const result = await deleteThing("thing-name");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Deleting thing thing-name");
    });
  });

  describe("attachCertToThing", () => {
    it("should return attach result", async () => {
      IoTClientMock.on(
        AttachThingPrincipalCommand,
        { principal: "certificate-arn", thingName: "1111111111" },
      ).resolves({ $metadata: {} });

      const result = await attachCertToThing("certificate-arn", "1111111111");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Attaching certificate certificate-arn to thing 1111111111");
    });
  });

  describe("detachCertFromThing", () => {
    it("should return attach result", async () => {
      IoTClientMock.on(
        DetachThingPrincipalCommand,
        { principal: "certificate-arn", thingName: "1111111111" },
      ).resolves({ $metadata: {} });

      const result = await detachCertFromThing("certificate-arn", "1111111111");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Detaching certificate certificate-arn from thing 1111111111");
    });
  });

  describe("publishToMqtt", () => {
    it("should return attach result", async () => {
      IoTDataPlaneClientMock.on(
        PublishCommand,
        { topic: "topic", payload: Buffer.from("message") },
      ).resolves({ $metadata: {} });

      const result = await publishToMqtt("topic", "message");

      expect(result).toStrictEqual({ $metadata: {} });
      expect(console.log).toHaveBeenCalledWith("Publishing message to MQTT topic topic", "message");
    });
  });
});
