process.env.SNS_FAILURE_SUMMARY_TOPIC = "SNS_FAILURE_SUMMARY_TOPIC";
process.env.IOT_CORE_POLICY_NAME = "IOT_CORE_POLICY_NAME";

import { mocked } from "jest-mock";
import { IoTCoreCertificate } from "../types/iotCoreCertificate";
import { IoTCoreThing } from "../types/iotCoreThing";
import { deleteCertificate, deleteThing, detachCertFromThing, detachPolicyFromCert, disableCertificate } from "../utils/awsIotCoreHelper";
import { deleteIotCertificate, deleteIotThing } from "./iotCoreService";

jest.mock("../utils/awsIotCoreHelper");

console.error = jest.fn();
const mockDetachCertFromThing = mocked(detachCertFromThing);
const mockDeleteThing = mocked(deleteThing);
const mockDetachPolicyFromCert = mocked(detachPolicyFromCert);
const mockDisableCertificate = mocked(disableCertificate);
const mockDeleteCertificate = mocked(deleteCertificate);

describe("IoT Core service", () => {
  let iotCertificate: IoTCoreCertificate;
  let iotThing: IoTCoreThing;

  beforeEach(() => {
    jest.resetAllMocks();
    iotCertificate = new IoTCoreCertificate({ id: "id", arn: "arn", pem: "pem", privateKey: "private-key" });
    iotThing = new IoTCoreThing({ name: "123456789" });
  });

  describe("deleteIotThing", () => {
    describe("when detachCertFromThing fails", () => {
      it("should log the error", async () => {
        mockDetachCertFromThing.mockRejectedValueOnce(new Error("Detach error"));

        await deleteIotThing(iotThing, iotCertificate);

        expect(mockDetachCertFromThing).toHaveBeenCalledWith("arn", "123456789");
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error deleting IoT thing: 123456789", new Error("Detach error"));
      });
    });

    describe("when deleteThing fails", () => {
      it("should log the error", async () => {
        mockDetachCertFromThing.mockResolvedValueOnce({ $metadata: {} });
        mockDeleteThing.mockRejectedValueOnce(new Error("Delete thing error"));

        await deleteIotThing(iotThing, iotCertificate);

        expect(mockDetachCertFromThing).toHaveBeenCalledWith("arn", "123456789");
        expect(mockDeleteThing).toHaveBeenCalledWith("123456789");
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error deleting IoT thing: 123456789", new Error("Delete thing error"));
      });
    });

    describe("when deleteIotThing succeeds", () => {
      it("should not log any error", async () => {
        mockDetachCertFromThing.mockResolvedValueOnce({ $metadata: {} });
        mockDeleteThing.mockResolvedValueOnce({ $metadata: {} });

        await deleteIotThing(iotThing, iotCertificate);

        expect(mockDetachCertFromThing).toHaveBeenCalledWith("arn", "123456789");
        expect(mockDeleteThing).toHaveBeenCalledWith("123456789");
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("deleteIotCertificate", () => {
    describe("when detachCertFromThing fails", () => {
      it("should log the error", async () => {
        mockDetachPolicyFromCert.mockRejectedValueOnce(new Error("Detach error"));

        await deleteIotCertificate(iotCertificate);

        expect(mockDetachPolicyFromCert).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME", "arn");
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error deleting IoT certificate: id", new Error("Detach error"));
      });
    });

    describe("when disableCertificate fails", () => {
      it("should log the error", async () => {
        mockDetachPolicyFromCert.mockResolvedValueOnce({ $metadata: {} });
        mockDisableCertificate.mockRejectedValueOnce(new Error("Delete thing error"));

        await deleteIotCertificate(iotCertificate);

        expect(mockDetachPolicyFromCert).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME", "arn");
        expect(mockDisableCertificate).toHaveBeenCalledWith("id");
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error deleting IoT certificate: id", new Error("Delete thing error"));
      });
    });

    describe("when deleteCertificate fails", () => {
      it("should log the error", async () => {
        mockDetachPolicyFromCert.mockResolvedValueOnce({ $metadata: {} });
        mockDisableCertificate.mockResolvedValueOnce({ $metadata: {} });
        mockDeleteCertificate.mockRejectedValueOnce(new Error("Delete thing error"));

        await deleteIotCertificate(iotCertificate);

        expect(mockDetachPolicyFromCert).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME", "arn");
        expect(mockDisableCertificate).toHaveBeenCalledWith("id");
        expect(mockDeleteCertificate).toHaveBeenCalledWith("id");
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenNthCalledWith(1, "Error deleting IoT certificate: id", new Error("Delete thing error"));
      });
    });

    describe("when deleteIotCertificate succeeds", () => {
      it("should not log any error", async () => {
        mockDetachPolicyFromCert.mockResolvedValueOnce({ $metadata: {} });
        mockDisableCertificate.mockResolvedValueOnce({ $metadata: {} });
        mockDeleteCertificate.mockResolvedValueOnce({ $metadata: {} });

        await deleteIotCertificate(iotCertificate);

        expect(mockDetachPolicyFromCert).toHaveBeenCalledWith("IOT_CORE_POLICY_NAME", "arn");
        expect(mockDisableCertificate).toHaveBeenCalledWith("id");
        expect(mockDeleteCertificate).toHaveBeenCalledWith("id");
        expect(console.error).toHaveBeenCalledTimes(0);
      });
    });
  });
});
