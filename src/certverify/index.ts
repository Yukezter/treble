import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execScriptSync } from "../helpers/scripts";

const cakeyDir = path.posix.join(process.cwd(), "docker", "pki");
const cakeyPath = path.posix.join(cakeyDir, "cakey.key");
const cacertPath = path.posix.join(cakeyDir, "cacert.crt");

let cacert: Buffer;

try {
  cacert = fs.readFileSync(cacertPath);
} catch (err) {
  console.log("no CA found, creating CA cert/key...");
  execScriptSync("ca.sh", { cwd: cakeyDir });
  cacert = fs.readFileSync(cacertPath);
}

export class CertVerifier {
  static cacert = cacert;
  static cakeyPath = cakeyPath;
  static cacertPath = cacertPath;

  // verify that the identity cert was signed by our ca
  static verify(x509IdentityCert: crypto.X509Certificate) {
    return x509IdentityCert.verify(crypto.createPublicKey(this.cacert));
  }
}
