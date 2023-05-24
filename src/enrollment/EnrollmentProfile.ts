import fs from "fs";
import crypto from "crypto";
import plist from "plist";

type Payload = {
  PayloadDescription?: string;
  PayloadDisplayName?: string;
  PayloadOrganization?: string;
  PayloadIdentifier: string;
  PayloadUUID: string;
  PayloadType: string;
  PayloadVersion: 1;
};

type PayloadArg = Pick<
  Payload,
  "PayloadDescription" | "PayloadDisplayName" | "PayloadOrganization"
>;

type CertificatePK12Payload = PayloadArg & {
  Password?: string;
  PayloadContent: Buffer;
};

type SCEPPayload = PayloadArg & {
  PayloadContent: {
    URL: string;
    Name?: string;
    Subject?: [[string, string]][];
    Challenge?: string;
    KeySize?: number;
    KeyType?: string;
    KeyUsage?: number;
    Retries?: number;
    RetryDelay?: number;
    CAFingerprint?: Buffer;
    AllowAllAppsAccess?: boolean;
    KeyIsExtractable?: boolean;
  };
};

type CertificatePK1Payload = PayloadArg & {
  PayloadCertificateFileName?: string;
  PayloadContent: Buffer;
};

type MDMPayload = PayloadArg & {
  IdentityCertificateUUID?: string;
  Topic: string;
  ServerURL: string;
  ServerCapabilities?: string[];
  SignMessage: boolean;
  CheckInURL?: string;
  CheckOutWhenRemoved?: boolean;
  AccessRights?: number;
  UseDevelopmentAPNS?: boolean;
  ServerURLPinningCertificateUUIDs?: string[];
  CheckInURLPinningCertificateUUIDs?: string[];
  PinningRevocationCheckRequired?: boolean;
};

type Payloads = CertificatePK12Payload | SCEPPayload | MDMPayload;

type ProfilePayload = PayloadArg & {
  PayloadContent: Payloads[];
  PayloadExpirationDate?: number;
  PayloadRemovalDisallowed?: boolean;
  PayloadScope?: string;
  PayloadDate?: number;
  DurationUntilRemoval?: number;
  ConsentText?: string[];
  EncryptedPayloadContent?: Buffer;
  HasRemovalPasscode?: boolean;
  IsEncrypted?: boolean;
  RemovalDate?: number;
  TargetDeviceType?: number;
};

type ProfilePayloadArg = Omit<ProfilePayload, "PayloadContent">;

type PayloadsArg = ProfilePayloadArg | CertificatePK12Payload | SCEPPayload | MDMPayload;

class EnrollmentProfile {
  enrollmentProfileID: string;
  payload: ProfilePayload;

  private createPayload = <T extends PayloadsArg>(
    PayloadIdentifier: string,
    PayloadType: string,
    options: T
  ): T & Payload => {
    return {
      ...options,
      PayloadIdentifier,
      PayloadUUID: crypto.randomUUID(),
      PayloadType,
      PayloadVersion: 1,
    };
  };

  constructor(enrollmentProfileID: string, payload: ProfilePayloadArg) {
    this.enrollmentProfileID = enrollmentProfileID;

    this.payload = this.createPayload(this.enrollmentProfileID, "Configuration", {
      PayloadContent: [],
      ...payload,
    });
  }

  certificatePK12Payload = (options: CertificatePK12Payload) => {
    const payload = this.createPayload(
      `${this.enrollmentProfileID}.identity`,
      "com.apple.security.pkcs12",
      options
    );

    this.payload.PayloadContent.push(payload);
    return payload;
  };

  scepPayload = (options: SCEPPayload) => {
    const payload = this.createPayload(
      `${this.enrollmentProfileID}.scep`,
      "com.apple.security.scep",
      options
    );

    this.payload.PayloadContent.push(payload);
    return payload;
  };

  certificateRootPayload = (options: CertificatePK1Payload) => {
    const payload = this.createPayload(
      `${this.enrollmentProfileID}.root`,
      "com.apple.security.root",
      options
    );

    this.payload.PayloadContent.push(payload);
    return payload;
  };

  certificatePK1Payload = (options: CertificatePK1Payload) => {
    const payload = this.createPayload(
      `${this.enrollmentProfileID}.pkcs1`,
      "com.apple.security.pkcs1",
      options
    );

    this.payload.PayloadContent.push(payload);
    return payload;
  };

  mdmPayload = (options: MDMPayload) => {
    const payload = this.createPayload(`${this.enrollmentProfileID}.mdm`, "com.apple.mdm", options);

    this.payload.PayloadContent.push(payload);
    return payload;
  };

  build = (write = false) => {
    const output = plist.build(this.payload);

    if (write) {
      fs.writeFileSync("./enroll.mobileconfig", output);
    }

    return output;
  };
}

export default EnrollmentProfile;
