import http2 from "http2";

const {
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_METHOD_POST,
  NGHTTP2_CANCEL,
} = http2.constants;

const MAX_PAYLOAD = 4096; // max is 4KB
const APNS_EXPIRATION = 60;
const url = "https://api.push.apple.com";

// TODO: enhance the retry logic
// TODO: add more logs for monitoring
// TODO: find out how we can determine if this connection is overloaded
class APNsClient {
  private client: http2.ClientHttp2Session;
  private opts: http2.SecureClientSessionOptions;
  private retries = 0;
  private retryInterval = 2000;
  private pingInterval = 1000 * 60 * 60;
  private activeRequests = 0;
  private lastResponseTime = 0;
  private stop = false;

  constructor(opts: http2.SecureClientSessionOptions = {}) {
    this.opts = opts;
    this.client = this.connect();
  }

  private connect() {
    const connect = () => {
      const client = http2.connect(url, this.opts);

      client.on("error", (err) => {
        console.log("APNs connection error:", err);
      });

      client.on("connect", (socket) => {
        console.log("connected to APNs...");
        this.retries = 0;
      });

      client.on("close", () => {
        console.log("disconnected from APNs...");
        this.activeRequests = 0;

        // the stop flag ensures we don't try to reconnect to a "stale" connection
        if (!this.stop) {
          setTimeout(() => {
            console.log("attempting to reconnect to APNs...");
            this.retries += 1;
            connect();
          }, this.retryInterval);
        }
      });

      // TODO: double check that this also emits a "close" event (I think it does)
      // if it doesn't, we'll need to reconnect in here too...
      client.on("goaway", (errorCode: number, lastStreamID: number, opaqueData: Buffer) => {
        console.log("goaway", {
          errorCode,
          lastStreamID,
          opaqueData: opaqueData.toString(),
        });
      });

      // ping APNs after some time of inactivity to keep connection open
      const ping = () => {
        client.ping((err, duration, payload) => {
          if (!err) {
            console.log(`ping acknowledged in ${duration} milliseconds`);
            this.lastResponseTime = Date.now();
          } else {
            console.log(err);
          }

          client.setTimeout(this.pingInterval, ping);
        });
      };

      client.setTimeout(this.pingInterval, ping);

      this.client = client;

      return client;
    };

    return connect();
  }

  // we call this when we know a push cert has changed
  // before we create a new connection with the new push cert
  disconnect() {
    this.stop = true;
    this.client.close();
  }

  push(pushInfo: PushInfo) {
    return new Promise<PushResponse>((resolve, reject) => {
      if (this.client.closed) {
        return new Error("APNs client session is closed");
      }

      const bodyBuffer = Buffer.from(JSON.stringify({ mdm: pushInfo.pushMagic }));

      if (bodyBuffer.byteLength > MAX_PAYLOAD) {
        throw new Error("payload too large (max is 4KB)");
      }

      const req = this.client.request({
        [HTTP2_HEADER_SCHEME]: "https",
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: `/3/device/${pushInfo.token}`,
        [HTTP2_HEADER_CONTENT_TYPE]: "application/json",
        [HTTP2_HEADER_CONTENT_LENGTH]: bodyBuffer.byteLength,
        "apns-expiration": Math.round(Date.now() / 1000 + APNS_EXPIRATION),
        "apns-priority": "10",
        "apns-topic": pushInfo.topic,
        "apns-push-type": "mdm",
      });

      req.end(bodyBuffer);

      // Close the stream after 5 seconds of inactivity
      req.setTimeout(1000 * 5, () => {
        req.close(NGHTTP2_CANCEL);
      });

      req.on("error", (err) => {
        console.log(err);
        reject(err);
      });

      req.on("ready", () => {
        this.activeRequests += 1;
      });

      req.on("response", (headers, flags) => {
        this.lastResponseTime = Date.now();

        resolve({
          status: headers[":status"] as number,
          push_notification_id: headers["apns-id"] as string,
        });
      });

      const chunks: Buffer[] = [];

      req.on("data", (data) => {
        chunks.push(data);
      });

      req.on("close", () => {
        this.activeRequests -= 1;

        const data = Buffer.concat(chunks).toString();
        console.log(data);
      });
    });
  }
}

// TODO: how do we handle push requests if APNs client is closed?
export class PushProvider {
  private client: APNsClient;
  staleToken: number;

  constructor(opts: http2.SecureClientSessionOptions = {}, staleToken: number) {
    this.client = new APNsClient(opts);
    this.staleToken = staleToken;
  }

  async push(pushInfo: PushInfo) {
    const response = await this.client.push(pushInfo);
    return response;
  }

  close() {
    this.client.disconnect();
  }
}
