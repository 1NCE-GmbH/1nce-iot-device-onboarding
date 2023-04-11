import { type AttributeValue } from "@aws-sdk/client-dynamodb";
import { type SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { type IDynamoItem } from "./common";

export const SQS_MESSAGE_GROUP_ID = "sims";

export class SIM {
  iccid: string;
  ip: string;
  createdTime: Date;
  updatedTime: Date;
  active: boolean;
  certificate: string;
  privateKey: string;

  constructor(sim: ISim) {
    this.iccid = sim.iccid;
    this.ip = sim.ip;
    this.createdTime = sim.createdTime ? new Date(sim.createdTime) : new Date();
    this.updatedTime = sim.updatedTime ? new Date(sim.updatedTime) : new Date();
    this.active = sim.active;
    this.certificate = sim.certificate;
    this.privateKey = sim.privateKey;
  }

  buildSqsMessageEntry(): SendMessageBatchRequestEntry {
    return {
      Id: this.iccid,
      MessageBody: JSON.stringify({
        iccid: this.iccid,
        ip: this.ip,
      }),
      MessageGroupId: SQS_MESSAGE_GROUP_ID,
      MessageDeduplicationId: this.iccid,
    };
  }

  toItem(): IDynamoSim {
    const item = {
      PK: `IP#${this.ip}`,
      SK: "P#MQTT",
      crt: this.certificate,
      prk: this.privateKey,
      ct: this.createdTime.toISOString(),
      ut: this.updatedTime.toISOString(),
      i: this.iccid,
      ip: this.ip,
      a: this.active,
    };

    return item;
  }

  toMessage(message: string): ISimMessage {
    return {
      iccid: this.iccid,
      ip: this.ip,
      timestamp: this.createdTime.valueOf(),
      message,
    };
  }
}

export function fromItem(item: IDynamoSim): SIM {
  return new SIM({
    iccid: item.i,
    ip: item.ip,
    createdTime: item.ct,
    updatedTime: item.ut,
    active: item.a,
    certificate: item.crt,
    privateKey: item.prk,
  });
}

export interface ISim {
  iccid: string;
  ip: string;
  createdTime?: string;
  updatedTime?: string;
  active: boolean;
  certificate: string;
  privateKey: string;
}

export interface ISimBss {
  iccid: string;
  imsi: string;
  msisdn: string;
  imei: string;
  imei_lock: boolean;
  status: string;
  activation_date: string;
  ip_address: string;
  quota_status: ISimBssQuotaStatus[];
  current_quota: number;
  quota_status_SMS: ISimBssQuotaStatus[];
  label: string;
}

interface ISimBssQuotaStatus {
  id: number;
  description: string;
}

export interface SimPerPageResults {
  results: SIM[];
  totalPages: number;
}

export interface IDynamoSim extends IDynamoItem {
  // certificate
  crt: string;
  // private key
  prk: string;
  // active
  a: boolean;
  // iccid
  i: string;
  // ip address
  ip: string;
  // createdAt
  ct: string;
  // updatedAt
  ut: string;
}

export interface ISimMessage {
  iccid: string;
  ip: string;
  timestamp: number;
  message: string;
}

export function keyFromIp(ip: string): Record<string, AttributeValue> {
  return {
    PK: { S: `IP#${ip}` },
    SK: { S: "P#MQTT" },
  };
}
