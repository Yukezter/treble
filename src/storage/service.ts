import * as db from "./db";

export const storeAuthenticate = async (req: CheckInReq, msg: AuthenticateMessage) => {
  const device: Device = {
    id: req.id,
    authenticate: msg.raw,
    authenticateAt: Date.now(),
  };

  if (req.certificate) {
    device.identityCert = req.certificate.raw.toString("base64");
  }

  if (msg.SerialNumber) {
    device.serialNumber = msg.SerialNumber;
  }

  await db.addItem(db.TABLES.ENROLLMENTS, device);
};

const storeDeviceTokenUpdate = async (req: CheckInReq, msg: TokenUpdateMessage) => {
  const device: Partial<Device> = {
    id: req.id,
    tokenUpdate: msg.raw,
    tokenUpdateAt: Date.now(),
  };

  // separately store the Unlock Token per MDM spec
  if (msg.UnlockToken) {
    device.unlockToken = msg.UnlockToken.toString();
    device.unlockTokenAt = Date.now();
  }

  await db.addItem(db.TABLES.DEVICES, device);
};

const storeUserTokenUpdate = async (req: CheckInReq, msg: TokenUpdateMessage) => {
  // there shouldn't be an Unlock Token on the user channel, but
  // complain if there is to warn an admin
  if (msg.UnlockToken) {
    console.log("Unlock Token on user channel not stored");
  }

  const user: User = {
    id: req.id,
    deviceID: req.parentID!,
    tokenUpdate: msg.raw,
    tokenUpdateAt: Date.now(),
  };

  if (msg.UserShortName) {
    user.userShortName = msg.UserShortName;
  }

  if (msg.UserLongName) {
    user.userLongName = msg.UserLongName;
  }

  await db.addItem(db.TABLES.USERS, user);
};

export const storeTokenUpdate = async (req: CheckInReq, msg: TokenUpdateMessage) => {
  let deviceID: string, userID: string | undefined;

  if (!req.parentID) {
    deviceID = req.id;
    await storeDeviceTokenUpdate(req, msg);
  } else {
    deviceID = req.parentID;
    userID = req.id;
    await storeUserTokenUpdate(req, msg);
  }

  const enrollment: Enrollment = {
    id: req.id,
    deviceID,
    userID,
    type: req.type,
    token: msg.Token.toString("hex"),
    pushMagic: msg.PushMagic,
    topic: msg.Topic,
    enabled: true,
    lastSeenAt: Date.now(),
    tokenUpdateTally: 0,
  };

  await db.addItem(db.TABLES.ENROLLMENTS, enrollment);
};

export const storeUserAuthenticate = async (req: CheckInReq, msg: UserAuthenticateMessage) => {
  const user: User = {
    id: req.id,
    deviceID: req.parentID!,
    tokenUpdate: msg.raw,
    tokenUpdateAt: Date.now(),
  };

  if (msg.UserShortName) {
    user.userShortName = msg.UserShortName;
  }

  if (msg.UserLongName) {
    user.userLongName = msg.UserLongName;
  }

  // if the DigestResponse is empty then this is the first (of two)
  // UserAuthenticate messages depending on our response
  if (!msg.DigestResponse) {
    user.userAuthenticate = msg.raw;
    user.userAuthenticateAt = Date.now();
  } else {
    user.userAuthenticateDigest = msg.raw;
    user.userAuthenticateDigestAt = Date.now();
  }
};

export const disableEnrollment = async (req: CheckInReq) => {
  if (req.parentID) {
    throw new Error("can only disable a device channel");
  }

  await db.updateItem(db.TABLES.ENROLLMENTS, req.id, {
    enabled: false,
  });
};

export const clearQueue = async (req: CheckInReq) => {
  if (req.parentID) {
    throw new Error("can only clear a device channel queue");
  }

  // TODO: move (or clear) this device's queue commands and not
  // now queue commands to an inactive queue table
};

export const updateLastSeen = async (req: CheckInReq) => {
  await db.updateItem(db.TABLES.ENROLLMENTS, req.id, {
    lastSeenAt: Date.now(),
  });
};
