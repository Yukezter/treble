interface Enrollment {
  id: string;
  deviceID: string;
  userID?: string;
  type: import("../enrollment").EnrollmentTypes;
  topic: string;
  pushMagic: string;
  token: string;
  enabled: boolean;
  lastSeenAt: number;
  tokenUpdateTally: number;
}

interface Device {
  id: string;
  identityCert?: string;
  serialNumber?: string;
  authenticate: string;
  authenticateAt: number;
  tokenUpdate?: string;
  tokenUpdateAt?: number;
  unlockToken?: string;
  unlockTokenAt?: number;
}

interface User {
  id: string;
  deviceID: string;
  userShortName?: string;
  userLongName?: string;
  userAuthenticate?: string;
  userAuthenticateAt?: number;
  userAuthenticateDigest?: string;
  userAuthenticateDigestAt?: number;
  tokenUpdate: string;
  tokenUpdateAt: number;
}

interface PushCert {
  topic: string;
  cert: string;
  key: string;
  staleToken: number;
}

type PushInfo = Pick<Enrollment, "id" | "topic" | "pushMagic" | "token">;
