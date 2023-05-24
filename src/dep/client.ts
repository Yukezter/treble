import http from "http";
import crypto from "crypto";

// TODO: test DEP API

interface DEPToken {
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
  access_secret: string;
}

interface DEPProfile {
  profile_name: string;
  profile_uuid: string;
  url: string;
  allow_pairing: boolean;
  is_supervised: boolean;
  is_multi_user: boolean;
  is_mandatory: boolean;
  await_device_configured: boolean;
  is_mdm_removable: boolean;
  support_phone_number: string;
  auto_advance_setup: boolean;
  support_email_address: string;
  org_magic: string;
  anchor_certs: string[];
  supervising_host_certs: string[];
  skip_setup_items: string[];
  department: string;
  devices: string[];
  language: string;
  region: string;
  configuration_web_url: string;
}

interface DEPSessionResponse {
  auth_session_token: string;
}

interface DEPProfileResponse {
  ProfileUUID: string;
  Devices: Record<string, string>;
}

interface DEPDeleteResponse {
  devices: Record<string, string>;
}

interface ClientOptions {
  method: string;
  headers: {
    "Content-Type": string;
    "Content-Length": number;
    Authorization?: string;
    "X-ADM-Auth-Session"?: string;
  };
}

enum PATHS {
  DEFINE = "/profile",
  ASSIGN = "/profile/devices",
  DELETE = "/profile/devices",
}

const BASE_URL = "https://mdmenrollment.apple.com";

const objToStr = (data: { [key: string]: any }, separator = ",", quote = true) => {
  const q = quote ? '"' : "";
  return Object.entries(data)
    .sort()
    .map(([k, v]) => `${percentEncode(k)}=${q}${percentEncode(v)}${q}`)
    .join(separator);
};

// https://stackoverflow.com/questions/26342123/replacement-for-javascript-escape
const percentEncode = (s: string) => {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => {
    return `%${c.charCodeAt(0).toString(16)}`;
  });
};

const createSignatureBase = (method: string, baseUrl: string, parameters: string) => {
  const encodedUrl = percentEncode(baseUrl);
  const encodedParameters = percentEncode(parameters);
  return `${method.toUpperCase()}&${encodedUrl}&${encodedParameters}`;
};

const sign = (base: string, key: string) => {
  return crypto.createHmac("sha1", key).update(base).digest("base64");
};

const createOAuthHeader = (method: string, url: URL, token: DEPToken) => {
  const queryParameters: Record<string, string> = {};
  for (const [name, value] of url.searchParams) {
    queryParameters[name] = value;
  }

  const oauth = {
    oauth_consumer_key: token.consumer_key,
    oauth_token: token.access_token,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };

  const parameters = {
    ...queryParameters,
    ...oauth,
  };

  const encodedParameters = percentEncode(objToStr(parameters, "&", false));
  const sigBaseStr = createSignatureBase(method, url.href, encodedParameters);
  const signingKey = `${token.consumer_secret}&${token.access_secret}`;

  return objToStr({
    ...oauth,
    oauth_signature: sign(sigBaseStr, signingKey),
  });
};

export class DEPClient {
  depToken: DEPToken;
  authSessionToken?: string;

  constructor(depToken: DEPToken) {
    this.depToken = depToken;
  }

  async session() {
    const resp = await this.request<DEPSessionResponse>("GET", "/session");
    this.authSessionToken = resp.auth_session_token;
  }

  async request<T>(method: string, path: string, body: any = {}) {
    const url = new URL(path, BASE_URL);
    const options: ClientOptions = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(body)),
        Authorization: createOAuthHeader(method, url, this.depToken),
      },
    };

    if (path !== "/session") {
      await this.session();
      options.headers["X-ADM-Auth-Session"] = this.authSessionToken;
    }

    return new Promise<T>((resolve, reject) => {
      const req = http.request(url, options);

      req.on("error", (err) => {
        console.log(err);
        reject(err);
      });

      req.on("response", (res) => {
        const chunks: Buffer[] = [];

        res.on("error", (err) => {
          reject(err);
        });

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const data = Buffer.concat(chunks).toString();
          resolve(JSON.parse(data));
        });
      });
    });
  }

  defineProfile(body: DEPProfile) {
    return this.request<DEPProfileResponse>("POST", PATHS.DEFINE, body);
  }

  assignProfile(profile_uuid: string, serials: string[]) {
    const body = { profile_uuid, devices: serials };
    return this.request<DEPProfileResponse>("PUT", PATHS.ASSIGN, body);
  }

  deleteProfile(serials: string[]) {
    const body = { devices: serials };
    return this.request<DEPDeleteResponse>("DELETE", PATHS.DELETE, body);
  }
}

// const percentEncode = () => {
//   const ordered = {};
//   Object.keys(parameters)
//     .sort()
//     .forEach(function (key) {
//       ordered[key] = parameters[key];
//     });

//   let encodedParameters = "";

//   for (k in ordered) {
//     const encodedValue = escape(ordered[k]);
//     const encodedKey = encodeURIComponent(k);

//     if (encodedParameters === "") {
//       encodedParameters += encodeURIComponent(`${encodedKey}=${encodedValue}`);
//     } else {
//       encodedParameters += encodeURIComponent(`&${encodedKey}=${encodedValue}`);
//     }
//   }
//   console.log(encodedParameters);
// };
