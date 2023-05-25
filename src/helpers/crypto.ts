import crypto from "crypto";
import { execScriptAsync } from "./scripts";
import { CertVerifier } from "../certverify";

type CreateIdentityProps = {
  subject: {
    C?: string;
    ST?: string;
    L?: string;
    O?: string;
    CN?: string;
  };
  passphrase: string;
};

export const extractTopicFromCert = (x509: crypto.X509Certificate) => {
  const names = x509.subject.split("\n");
  for (let i = 0; i < names.length; i++) {
    if (names[i].startsWith("UID=com.apple.mgmt")) {
      return names[i].split("=")[1];
    }
  }
};

export const createIdentityCertificate = async (opts: CreateIdentityProps) => {
  let subject = "";
  for (let key in opts.subject) {
    const val = (opts.subject as Record<string, string>)[key];
    subject += `/${key}=${val.replace(" ", "\\ ")}`;
  }

  const result = await execScriptAsync("identity.sh", [
    subject,
    CertVerifier.cakeyPath,
    CertVerifier.cacertPath,
    opts.passphrase,
  ]);

  return Buffer.from(result.stdout, "base64");
};

// This function calls a script that verifies the detached CMS signature
// It then verifies that the signer certificate was signed by our CA
// This will throw an error if either of these don't pass
const verifyDetachedSig = async (sig: string, content: string) => {
  const result = await execScriptAsync("verify.sh", [`'${sig}'`, `'${content}'`]);
  const x509IdentityCert = new crypto.X509Certificate(result.stdout);

  return x509IdentityCert;
};

export const verifyMdmSig = async (b64MdmSig: string, body: crypto.BinaryLike) => {
  const result = await verifyDetachedSig(b64MdmSig, body.toString());
  return result;
};
