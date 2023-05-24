import tls from "tls";
import crypto from "crypto";
import { BadRequest } from "../server/errors";
import { extractTopicFromCert } from "../helpers/crypto";
import { storePushCert, getPushInfos } from "../storage/push_cert";
import { push } from "../push/service";

const readPEMCertAndKey = (input: string) => {
  let cert = "",
    key = "";
  // TODO: come up with more a reliable parsing solution
  const blocks = input.replace(/ (?=-----)|(?<=------) |(?<=-----) /g, "\n");
  const s = blocks.split("-----").filter((s) => !!s && s !== "\n");

  for (let i = 0; i < s.length; i += 3) {
    let pem = "-----" + s[i] + "-----";
    pem += s[i + 1];
    pem += "-----" + s[i + 2] + "-----";

    if (s[i].endsWith("CERTIFICATE")) {
      cert = pem;
      continue;
    }

    if (s[i].endsWith("PRIVATE KEY")) {
      if (s[i].endsWith("ENCRYPTED PRIVATE KEY")) {
        throw new BadRequest("private key PEM appears to be encrypted");
      }

      key = pem;
    }
  }

  return { cert, key };
};

// handler for uploading push cert/key
// cat private.key cert.pem | curl -T - https://your-url/api/pushcert
// or with PowerShell
// $body = Get-Content PushCertificate.pem, PushCertificatePrivateKey.key
// Invoke-RestMethod -Uri "https://your-url/api/pushcert" -Body $body -Method "POST"
export const pushCertHandler: Handler = async (req, res) => {
  const body = (await req.body()).toString().trim();

  if (!body) {
    throw new BadRequest("no cert/key provided");
  }

  const { cert, key } = readPEMCertAndKey(body);

  try {
    // sanity check the provided cert and key to make sure they're usable as a pair.
    tls.createSecureContext({ cert, key });
  } catch (err) {
    throw new BadRequest("bad cert/key pair");
  }

  // extract topic and store key pair
  const x509PushCert = new crypto.X509Certificate(cert);
  const topic = extractTopicFromCert(x509PushCert);

  if (!topic) {
    throw new BadRequest("no topic found in push cert");
  }

  try {
    await storePushCert(topic, cert, key);

    res.json({ topic });
  } catch (err) {
    console.log(err);
    throw new BadRequest("error storing push cert");
  }
};

export const pushHandler: Handler = async (req, res) => {
  const ids = req.params.id?.split(",").filter(Boolean);

  if (!ids) {
    throw new BadRequest("no id provided");
  }

  const idToPushInfo = await getPushInfos(ids);

  const idToResponse: { [id: string]: PushResponse } = {};
  const tokenToId: { [token: string]: string } = {};
  const pushInfos: PushInfo[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const pushInfo = idToPushInfo[id];

    if (!pushInfo) {
      // TODO: ids not found in push infos get a not found response
      // idToResponse[id] = { err: "not found" };
    } else {
      tokenToId[pushInfo.token] = id;
      pushInfos.push(pushInfo);
    }
  }

  const tokenToResponse = await push(pushInfos);

  for (const token in tokenToResponse) {
    const id = tokenToId[token];

    if (!id) {
      console.log("could not find id by token");
      continue;
    }

    idToResponse[id] = tokenToResponse[token];
  }

  res.json(idToResponse);
};

// TODO
export const enrollmentsHandler: Handler = (req, res) => {
  res.end();
};

// TODO
export const devicesHandler: Handler = (req, res) => {
  res.end();
};

// TODO
export const usersHandler: Handler = (req, res) => {
  res.end();
};
