import plist from "plist";

const SharediPadUserID = "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF";

enum EnrollmentTypes {
  DEVICE = 1,
  USER = 2,
  USER_ENROLLMENT_DEVICE = 3,
  USER_ENROLLMENT = 4,
  SHARED_IPAD = 5,
}

const ENROLLMENT_TYPES = Object.values(EnrollmentTypes);

export const createCheckInMessage = (body: string) => {
  // parse plist message to a CheckInMessage type
  const msg: any = plist.parse(body);

  if (process.env.DEBUG) {
    console.log(msg);
  }

  // keep a reference to raw plist string
  msg.raw = body;

  // group all enrollment-related data from the checkin message
  msg.enrollment = {
    udid: msg.UDID,
    userID: msg.UserID,
    userShortName: msg.UserShortName,
    userLongName: msg.UserLongName,
    enrollmentID: msg.EnrollmentID,
    enrollmentUserID: msg.EnrollmentUserID,
  } as EnrollmentFromMessage;

  return msg as CheckInMessage;
};

// here we narrow down the enrollment data to an "enrollment type"
// and a determine if it's a "device channel" or "user channel"
// if it's a "user channel" enrollment, we store both device id and user id
const resolveEnrollment = (e: EnrollmentFromMessage) => {
  if (e.udid) {
    const resolvedEnrollment: ResolvedEnrollment = {
      type: EnrollmentTypes.DEVICE,
      deviceChannelID: e.udid,
      isUserChannel: false,
    };

    if (e.userID) {
      resolvedEnrollment.isUserChannel = true;
      if (e.userID == SharediPadUserID) {
        resolvedEnrollment.type = EnrollmentTypes.SHARED_IPAD;
        resolvedEnrollment.userChannelID = e.userShortName;
      } else {
        resolvedEnrollment.type = EnrollmentTypes.USER;
        resolvedEnrollment.userChannelID = e.userID;
      }
    }

    return resolvedEnrollment;
  }

  if (e.enrollmentID) {
    const resolvedEnrollment: ResolvedEnrollment = {
      type: EnrollmentTypes.USER_ENROLLMENT_DEVICE,
      deviceChannelID: e.enrollmentID,
      isUserChannel: false,
    };

    if (e.enrollmentUserID) {
      resolvedEnrollment.isUserChannel = true;
      resolvedEnrollment.type = EnrollmentTypes.USER_ENROLLMENT;
      resolvedEnrollment.userChannelID = e.enrollmentUserID;
    }

    return resolvedEnrollment;
  }

  return null;
};

// create a unique "enrollment" id by concatenating the device and user
// channel ids if enrollment is a user channel
const normalizeEnrollment = (e: EnrollmentFromMessage): EnrollID | null => {
  const resolvedEnrollment = resolveEnrollment(e);

  if (resolvedEnrollment === null) {
    return resolvedEnrollment;
  }

  const enrollID: EnrollID = {
    type: resolvedEnrollment.type,
    id: resolvedEnrollment.deviceChannelID,
  };

  if (resolvedEnrollment.isUserChannel) {
    enrollID.id += ":" + resolvedEnrollment.userChannelID;
    enrollID.parentID = resolvedEnrollment.deviceChannelID;
  }

  return enrollID;
};

export const setupRequest = (req: Req, e: EnrollmentFromMessage) => {
  const enrollID = normalizeEnrollment(e);

  if (enrollID === null) {
    throw new Error("enrollID is null");
  }

  if (!enrollID.id) {
    throw new Error("empty enrollment ID");
  }

  if (!ENROLLMENT_TYPES.includes(enrollID.type)) {
    throw new Error("invalid enrollment ID type");
  }

  const r = req as CheckInReq;

  if (r.id) {
    console.log("overwriting enrollment id");
  }

  r.id = enrollID.id;
  r.type = enrollID.type;
  r.parentID = enrollID.parentID;

  return r;
};
