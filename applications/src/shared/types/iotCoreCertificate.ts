import { attachPolicyToCert, generateCertificate } from "../utils/awsIotCoreHelper";

export class IoTCoreCertificate {
  id: string;
  arn: string;
  certificate: string;
  privateKey: string;

  constructor(certificate: IIoTCoreCertificate) {
    this.id = certificate.id;
    this.arn = certificate.arn;
    this.certificate = certificate.pem;
    this.privateKey = certificate.privateKey;
  }

  async attachPolicy(policyName: string): Promise<void> {
    await attachPolicyToCert(policyName, this.arn);
  }

  static async create(): Promise<IoTCoreCertificate> {
    const certificate = await generateCertificate();
    return new IoTCoreCertificate(certificate);
  }
}

export interface IIoTCoreCertificate {
  id: string;
  arn: string;
  pem: string;
  privateKey: string;
}
