import { BadRequest } from "../server/errors";
import { createCheckInMessage, setupRequest } from "../helpers/enrollment";
import { updateLastSeen } from "../storage/service";

// TODO: mdm command handler
export const mdmHandler: Handler = async (req, res) => {
  const body = await req.body();

  if (!body.byteLength) {
    throw new BadRequest();
  }

  const msg = createCheckInMessage(body.toString());
  const r = setupRequest(req, msg.enrollment);

  await updateLastSeen(r);

  res.end();
};
