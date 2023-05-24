import fs from "fs";
import crypto from "crypto";
import cprocess from "child_process";
import os from "os";
import path from "path";
import util from "util";
import { Forbidden } from "../server/errors";

const execFile = util.promisify(cprocess.execFile);
const osTmpDir = os.tmpdir();

export const extractTopicFromCert = (x509: crypto.X509Certificate) => {
  const names = x509.subject.split("\n");
  for (let i = 0; i < names.length; i++) {
    if (names[i].startsWith("UID=com.apple.mgmt")) {
      return names[i].split("=")[1];
    }
  }
};

let base = path.join(__dirname, "..").split(path.sep).join(path.posix.sep);

if (os.platform() === "win32") {
  base = path.posix.join("/mnt", base.replace(/^C:/, "c"));
}

// TODO: sanitize parameters we're putting in command args array
const script = (file: string, args: string[] = []) => {
  return execFile(path.posix.join(base, "scripts", file), args, {
    cwd: osTmpDir,
    shell: "bash",
    timeout: 3000,
  });
};

type CreateIdentityProps = {
  subject: {
    C?: string;
    ST?: string;
    L?: string;
    O?: string;
    CN?: string;
  };
  caKeyPath: string;
  caCertPath: string;
  passphrase: string;
};

// TODO: we shouldn't have to pass the ca cert/key paths to this
export const createIdentityCertificate = async (opts: CreateIdentityProps) => {
  let subject = "";
  for (let key in opts.subject) {
    const val = (opts.subject as Record<string, string>)[key];
    subject += `/${key}=${val.replace(" ", "\\ ")}`;
  }

  const result = await script("identity.sh", [
    subject,
    path.posix.join(base, opts.caKeyPath),
    path.posix.join(base, opts.caCertPath),
    opts.passphrase,
  ]);

  return Buffer.from(result.stdout, "base64");
};

const cacert = fs.readFileSync(path.join(__dirname, "..", "server", "cacert.crt"));

// This function calls a script that verifies the detached CMS signature
// It then verifies that the signer certificate was signed by our CA
// This will throw an error if either of these don't pass
const verifyDetachedSig = async (sig: string, content: string) => {
  const result = await script("verify.sh", [`'${sig}'`, `'${content}'`]);
  const x509IdentityCert = new crypto.X509Certificate(result.stdout);

  if (!x509IdentityCert.verify(crypto.createPublicKey(cacert))) {
    throw new Forbidden("invalid identity cert issuer");
  }

  return x509IdentityCert;
};

export const verifyMdmSig = async (b64MdmSig: string, body: crypto.BinaryLike) => {
  const result = await verifyDetachedSig(b64MdmSig, body.toString());
  return result;
};
