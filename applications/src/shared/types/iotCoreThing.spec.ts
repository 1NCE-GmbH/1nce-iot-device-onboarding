import { mocked } from "jest-mock";
import { attachCertToThing, createThing } from "../utils/awsIotCoreHelper";
import { IoTCoreThing } from "./iotCoreThing";

jest.mock("../utils/awsIotCoreHelper");

const mockCreateThing = mocked(createThing);
const mockAttachCertToThing = mocked(attachCertToThing);

const iotCoreThing = new IoTCoreThing({
  name: "thing-name",
});

describe("IoT Core Thing", () => {
  describe("constructor", () => {
    it("should build IoT Core Thing instance", async () => {
      const result = new IoTCoreThing({ name: "thing-name" });

      expect(result.name).toStrictEqual("thing-name");
    });
  });

  describe("attachCertificate", () => {
    describe("when certificate is not properly attached to policy", () => {
      it("should return false", async () => {
        const error = "Error creating certificate";
        mockAttachCertToThing.mockRejectedValueOnce(error);

        try {
          await iotCoreThing.attachCertificate("certificate-arn");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockAttachCertToThing).toHaveBeenCalledWith("certificate-arn", "thing-name");
      });
    });

    describe("when certificate is created", () => {
      it("should return false", async () => {
        mockAttachCertToThing.mockResolvedValueOnce({ $metadata: {} });

        await iotCoreThing.attachCertificate("certificate-arn");

        expect(mockAttachCertToThing).toHaveBeenCalledWith("certificate-arn", "thing-name");
      });
    });
  });

  describe("create", () => {
    describe("when thing is not properly created", () => {
      it("should return false", async () => {
        const error = "Error creating thing";
        mockCreateThing.mockRejectedValueOnce(error);

        try {
          await IoTCoreThing.create("thing-name");
          fail("Test should throw error");
        } catch (error) {
          expect(error).toStrictEqual(error);
        }

        expect(mockCreateThing).toHaveBeenCalledWith("thing-name");
      });
    });

    describe("when thing is created", () => {
      it("should return false", async () => {
        mockCreateThing.mockResolvedValueOnce({ name: "thing-name" });

        const result = await IoTCoreThing.create("thing-name");

        expect(result.name).toStrictEqual("thing-name");
        expect(mockCreateThing).toHaveBeenCalledWith("thing-name");
      });
    });
  });
});
