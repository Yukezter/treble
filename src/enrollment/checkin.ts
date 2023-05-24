import * as storage from "../storage/service";
import { Gone } from "../server/errors";
import { setupRequest } from "../helpers/enrollment";

const sendEmptyDigestChallenge = false;
const storeRejectedUserAuth = false;
const emptyDigestChallenge = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>DigestChallenge</key>
	<string></string>
</dict>
</plist>`;

export const authenticate = async (req: Req, msg: AuthenticateMessage) => {
  const r = setupRequest(req, msg.enrollment);

  await Promise.all([
    storage.storeAuthenticate(r, msg),
    storage.clearQueue(r),
    storage.disableEnrollment(r),
  ]);
};

export const userAuthenticate = async (req: Req, msg: UserAuthenticateMessage) => {
  const r = setupRequest(req, msg.enrollment);

  if (sendEmptyDigestChallenge || storeRejectedUserAuth) {
    await storage.storeUserAuthenticate(r, msg);
  }

  // if the DigestResponse is empty then this is the first (of two)
  // UserAuthenticate messages depending on our response
  if (!msg.DigestResponse) {
    if (sendEmptyDigestChallenge) {
      console.log("sending empty DigestChallenge response to UserAuthenticate");

      return emptyDigestChallenge;
    }

    throw new Gone("declining management of user: " + r.id);
  }

  console.log("sending empty response to second UserAuthenticate");
};

export const tokenUpdate = async (req: Req, msg: TokenUpdateMessage) => {
  const r = setupRequest(req, msg.enrollment);
  await storage.storeTokenUpdate(r, msg);

  console.log("new enrollment:", r.id);
};

export const checkOut = async (req: Req, msg: CheckOutMessage) => {
  const r = setupRequest(req, msg.enrollment);
  await storage.disableEnrollment(r);

  console.log("removed enrollment:", r.id);
};

export const setTokenBootstrap = async (req: Req, msg: SetBootstrapTokenMessage) => {
  // TODO
  const r = setupRequest(req, msg.enrollment);
};

export const getTokenBootstrap = async (req: Req, msg: GetBootstrapTokenMessage) => {
  // TODO
  const r = setupRequest(req, msg.enrollment);
};

export const declarativeManagement = async (req: Req, msg: DeclarativeManagementMessage) => {
  // TODO
  const r = setupRequest(req, msg.enrollment);
};
