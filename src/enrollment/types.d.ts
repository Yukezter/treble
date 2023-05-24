// Enrollment represents the various enrollment-related data sent with requests.
type EnrollmentFromMessage = {
  udid?: string;
  userID?: string;
  userShortName?: string;
  userLongName?: string;
  enrollmentID?: string;
  enrollmentUserID?: string;
};

interface CheckInMessageBase {
  raw: string;
  enrollment: EnrollmentFromMessage;
}

// See https://developer.apple.com/documentation/devicemanagement/authenticaterequest
interface AuthenticateMessage extends CheckInMessageBase {
  MessageType: import(".").MessageTypes.AUTHENTICATE;
  UDID: string; // The device's UDID (Unique Device ID).
  EnrollmentID: string; // The per-enrollment identifier for the device. Available in macOS 10.15 and iOS 13.0 and later.
  Topic: string; // The topic to which the device subscribes.
  DeviceName: string; // The device's name.
  Model: string; // The device's model.
  ModelName: string; // The device's model name.
  OSVersion?: string; // The deviceʼs OS version.
  BuildVersion?: string; // // The deviceʼs build version.
  ProductName?: string; // The device's product name (iPhone3,1).
  SerialNumber?: string; // The deviceʼs serial number.
  IMEI?: string; // The deviceʼs IMEI (International Mobile Station Equipment Identity).
  MEID?: string; // The deviceʼs MEID (mobile equipment identifier).
}

// The server should not assume that the device has installed the MDM payload
// at this time, as other payloads in the profile may still fail to install.
// When the device has successfully installed the MDM payload, it sends a token
// update message.

// See https://developer.apple.com/documentation/devicemanagement/userauthenticaterequest
interface UserAuthenticateMessage extends CheckInMessageBase {
  MessageType: import(".").MessageTypes.USER_AUTHENTICATE;
  UDID: string; // The device's UDID (Unique Device ID).
  UserID: string; // Local mobile user's GUID or network user's GUID from an Open Directory record.
  DigestResponse: string; // A string provided by the client on second UserAuthenticate request after receiving DigestChallenge from server on first UserAuthenticate request.
  UserShortName?: string; // Record name from userʼs Open Directory record.
  UserLongName?: string; // Full name from userʼs Open Directory record.
  AuthToken?: string; // Token obtained from above.
}

// See https://developer.apple.com/documentation/devicemanagement/token_update
interface TokenUpdateMessage extends CheckInMessageBase {
  MessageType: import(".").MessageTypes.TOKEN_UPDATE;
  UDID: string; // The device's UDID (Unique Device ID).
  EnrollmentID: string; // The per-enrollment identifier for the device. Available in macOS 10.15 and iOS 13.0 and later.
  EnrollmentUserID: string; // The per-enrollment identifier for the user. Available in macOS 10.15 and iOS 13.0 and later.
  Token: Buffer; // The push token for the device.
  Topic: string;
  PushMagic: string; // The magic string that has to be included in the push notification message.
  AwaitingConfiguration: boolean; // If true, the device is awaiting a Release Device from Await Configuration MDM command before proceeding through Setup Assistant.
  NotOnConsole: boolean; // If true, the device is not on console.
  UserID: string; // On macOS: This is the ID of the user. On Shared iPad: This is always FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF to indicate that no authentication will occur.
  UnlockToken?: Buffer; // The data that can be used to unlock the device. If provided, the server should remember this data and send it with when trying to Clear the Passcode.
  UserShortName?: string; // On Shared iPad: This is the Managed Apple ID of the user on Shared iPad. It indicates that the token is for the user channel. On macOS, this is the short name of the user.
  UserLongName?: string; // The full name of the user.
}

// See https://developer.apple.com/documentation/devicemanagement/checkoutrequest
interface CheckOutMessage extends CheckInMessageBase {
  MessageType: import(".").MessageTypes.CHECK_OUT;
  UDID: string; // The device's UDID (Unique Device ID).
  Topic: string; // The topic to which the device subscribed.
  EnrollmentID: string; // The per-enrollment identifier for the device. Available in macOS 10.15 and iOS 13.0 and later.
}

// See https://developer.apple.com/documentation/devicemanagement/setbootstraptokenrequest
interface SetBootstrapTokenMessage extends CheckInMessageBase {
  enrollment: Enrollment;
  MessageType: import(".").MessageTypes.SET_BOOTSTRAP_TOKEN;
  BootstrapToken?: string; // The device's bootstrap token data. If this field is missing or zero length, the bootstrap token should be removed for this device.
  AwaitingConfiguration?: boolean; // If true, the device is awaiting a DeviceConfigured MDM command before proceeding through Setup Assistant.
}

// See https://developer.apple.com/documentation/devicemanagement/getbootstraptokenrequest
interface GetBootstrapTokenMessage extends CheckInMessageBase {
  enrollment: Enrollment;
  MessageType: import(".").MessageTypes.GET_BOOTSTRAP_TOKEN;
  AwaitingConfiguration?: boolean; // If true, the device is awaiting a DeviceConfigured MDM command before proceeding through Setup Assistant.
}

// See https://developer.apple.com/documentation/devicemanagement/declarativemanagementrequest
interface DeclarativeManagementMessage extends CheckInMessageBase {
  enrollment: Enrollment;
  MessageType: import(".").MessageTypes.DECLARATIVE_MANAGEMENT;
  Data: Buffer; // A Base64-encoded JSON object using the SynchronizationTokens schema.
  Endpoint: string; // The type of operation the declaration is requesting. This key must be one of these values:
  // tokens: For fetching synchronization tokens from the server
  // declaration-items: For fetching the declaration manifest from the server
  // status: For sending a status report to the server
  // declaration/…/…: For fetching a specific declaration from the server. Include the declaration type and identifier separated by forward slashes (/).
  EnrollmentID: string; // The per-enrollment identifier for the device.
  EnrollmentUserID: string;
  UserID?: string;
  UserLongName: string;
  UserShortName?: string;
}

// ResolvedEnrollment is a sort of collapsed form of Enrollment.
type ResolvedEnrollment = {
  type: import(".").EnrollmentTypes;
  deviceChannelID: string;
  userChannelID?: string;
  isUserChannel: boolean;
};

type EnrollID = {
  type: import(".").EnrollmentTypes;
  id: string;
  parentID?: string;
};

interface CheckInMessage
  extends Partial<AuthenticateMessage>,
    Partial<UserAuthenticateMessage>,
    Partial<TokenUpdateMessage>,
    Partial<CheckOutMessage>,
    Partial<SetBootstrapTokenMessage>,
    Partial<GetBootstrapTokenMessage>,
    Partial<DeclarativeManagementMessage> {
  MessageType: MessageTypes;
  enrollment: Enrollment;
}

interface CheckInReq extends Req {
  type: import(".").EnrollmentTypes;
  id: string;
  parentID?: string;
  message: CheckInMessage;
}
