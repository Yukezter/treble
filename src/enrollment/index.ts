import crypto from "crypto";
import { ENDPOINTS } from "../server";
import {
  authenticate,
  userAuthenticate,
  tokenUpdate,
  checkOut,
  setTokenBootstrap,
  getTokenBootstrap,
  declarativeManagement,
} from "./checkin";
import { BadRequest, NotFound } from "../server/errors";
import EnrollmentProfile from "./EnrollmentProfile";
import * as db from "../storage/db";
import { createCheckInMessage } from "../helpers/enrollment";
import { extractTopicFromCert, createIdentityCertificate } from "../helpers/crypto";

// these are all the mdm checkin message types
export enum MessageTypes {
  AUTHENTICATE = "Authenticate",
  TOKEN_UPDATE = "TokenUpdate",
  CHECK_OUT = "CheckOut",
  USER_AUTHENTICATE = "UserAuthenticate",
  SET_BOOTSTRAP_TOKEN = "SetBootstrapToken",
  GET_BOOTSTRAP_TOKEN = "GetBootstrapToken",
  DECLARATIVE_MANAGEMENT = "DeclarativeManagement",
}

// we split enrollment into 5 different types
export enum EnrollmentTypes {
  DEVICE = 1,
  USER = 2,
  USER_ENROLLMENT_DEVICE = 3,
  USER_ENROLLMENT = 4,
  SHARED_IPAD = 5,
}

const PayloadOrganization = "RoomNet";
const perUserConnections = "com.apple.mdm.per-user-connections";
const bootstrapToken = "com.apple.mdm.bootstraptoken";

// fetch push cert and extract topic from push cert for enrollment profile
const getTopicForEnrollment = async () => {
  // TODO: associate enrollment profiles / push certs with a "customer" id
  // for now, we'll use the first one we find...
  const pushCerts = await db.getAllItems<PushCert>(db.TABLES.PUSH_CERTS);

  if (!pushCerts || !pushCerts[0]) {
    throw new BadRequest("no push cert found for enrollment profile");
  }

  const pushCert = pushCerts[0].cert;
  const x509PushCert = new crypto.X509Certificate(pushCert);
  const topic = extractTopicFromCert(x509PushCert);

  return topic;
};

export const generateEnrollmentProfile = async (host?: string) => {
  const topic = await getTopicForEnrollment();

  if (!topic) {
    throw new BadRequest("no topic found in push cert");
  }

  // create device identity
  const p12Certificate = await createIdentityCertificate({
    subject: {
      C: "US",
      ST: "CA",
      O: "RoomNet",
      CN: "Identity Certificate",
    },
    caKeyPath: "/server/cakey.key",
    caCertPath: "/server/cacert.crt",
    passphrase: "treble",
  });

  // create enrollment profile
  const profile = new EnrollmentProfile("com.roomnet.treble", {
    PayloadScope: "System",
    PayloadOrganization,
    PayloadDisplayName: "Enrollment Profile",
    PayloadDescription: "The server may alter your settings",
  });

  // create payloads
  const identityPayload = profile.certificatePK12Payload({
    Password: "treble",
    PayloadContent: p12Certificate,
    PayloadDisplayName: "CertificatePKCS12",
    PayloadOrganization,
  });

  // this is what the scep payload will look like
  // const scepPayload = profile.scepPayload({
  //   PayloadContent: {
  //     URL: `https://${host}${ENDPOINTS.SCEP}`,
  //     KeySize: 2048,
  //     KeyType: "RSA",
  //     KeyUsage: 5,
  //     Name: "Device Management Identity Certificate",
  //     Subject: [[["O", "TREBLE"]], [["CN", "TREBLE Identity"]]],
  //     Challenge: "TREBLE",
  //   },
  //   PayloadDescription: "Configures SCEP",
  //   PayloadDisplayName: "SCEP",
  //   PayloadOrganization,
  // });

  profile.mdmPayload({
    PayloadOrganization,
    PayloadDescription: "Enrolls with the MDM server",
    ServerURL: `https://${host}${ENDPOINTS.MDM}`,
    CheckInURL: `https://${host}${ENDPOINTS.CHECK_IN}`,
    CheckOutWhenRemoved: true,
    IdentityCertificateUUID: identityPayload.PayloadUUID,
    AccessRights: 8191,
    Topic: topic,
    SignMessage: true,
    ServerCapabilities: [perUserConnections, bootstrapToken],
  });

  return profile.build();
};

export const enrollHandler: Handler = async (req, res) => {
  const mobileconfig = await generateEnrollmentProfile(req.headers.host);
  res.setHeader("Content-Type", "application/x-apple-aspen-config");
  res.setHeader("Content-Disposition", 'attachment;filename="Enroll.mobileconfig"');
  res.end(mobileconfig);
};

// handle all checkin messages
export const checkInHandler: Handler = async (req, res) => {
  const body = await req.body();

  if (!body.byteLength) {
    throw new BadRequest();
  }

  let data: string | undefined;
  const msg = createCheckInMessage(body.toString());

  switch (msg.MessageType) {
    case MessageTypes.AUTHENTICATE:
      await authenticate(req, msg as AuthenticateMessage);
      break;
    case MessageTypes.USER_AUTHENTICATE:
      data = await userAuthenticate(req, msg as UserAuthenticateMessage);
      break;
    case MessageTypes.TOKEN_UPDATE:
      await tokenUpdate(req, msg as TokenUpdateMessage);
      break;
    case MessageTypes.CHECK_OUT:
      await checkOut(req, msg as CheckOutMessage);
      break;
    case MessageTypes.SET_BOOTSTRAP_TOKEN:
      await setTokenBootstrap(req, msg as SetBootstrapTokenMessage);
      break;
    case MessageTypes.GET_BOOTSTRAP_TOKEN:
      await getTokenBootstrap(req, msg as GetBootstrapTokenMessage);
      break;
    case MessageTypes.DECLARATIVE_MANAGEMENT:
      await declarativeManagement(req, msg as DeclarativeManagementMessage);
      break;
    default:
      throw new NotFound("Unhandled message type");
  }

  res.send(data);
};
