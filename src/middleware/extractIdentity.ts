import { BadRequest } from "../server/errors";
import { verifyMdmSig } from "../helpers/crypto";

// This middleware verifies the CMS detached signature sent by the device
// and attaches the certificate to the req instance
export const extractIdentity: Handler = async (req, res) => {
  const mdmSig = req.headers["mdm-signature"];

  if (typeof mdmSig !== "string") {
    throw new BadRequest();
  }

  const body = await req.body();

  if (!body.byteLength) {
    throw new BadRequest();
  }

  const certificate = await verifyMdmSig(mdmSig, body);

  if (process.env.DEBUG) {
    console.log(certificate.toString());
  }

  req.certificate = certificate;
};
