import { CertVerifier } from "../certverify";
import { Forbidden } from "../server/errors";

export const verifyIdentitySigner: Handler = (req, res) => {
  if (!req.certificate) {
    throw new Forbidden("no identity cert found");
  }

  if (!CertVerifier.verify(req.certificate)) {
    throw new Forbidden("invalid identity cert issuer");
  }
};
