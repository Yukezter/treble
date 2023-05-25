import { PushProvider } from "./apns";
import { getPushCert, isPushCertStale } from "../storage/push_cert";

// a map to store all the push providers in memory
const providers: { [topic: string]: PushProvider } = {};

// this gets (or creates) the right APNs connection by topic
const getPushProvider = async (topic: string) => {
  if (providers[topic]) {
    if (await isPushCertStale(topic, providers[topic].staleToken)) {
      console.log("is stale");
      // if the push cert has changed, close the session
      providers[topic].close();
      // delete the key/value from object so we can re-create it below
      delete providers[topic];
    }
  }

  if (!providers[topic]) {
    const pushCert = await getPushCert(topic);

    if (!pushCert) {
      throw new Error("push provider: no push cert found");
    }

    const { cert, key, staleToken } = pushCert;
    providers[topic] = new PushProvider({ cert, key }, staleToken);
  }

  return providers[topic];
};

export const push = async (pushInfos: PushInfo[]) => {
  const topicToPushInfos: { [topic: string]: PushInfo[] } = {};

  for (let i = 0; i < pushInfos.length; i++) {
    const pushInfo = pushInfos[i];

    if (!topicToPushInfos[pushInfo.topic]) {
      topicToPushInfos[pushInfo.topic] = [];
    }

    topicToPushInfos[pushInfo.topic].push(pushInfo);
  }

  const tokenToResponse: { [token: string]: PushResponse } = {};
  const requestsByTopic: Promise<void>[] = [];

  // group requests by topic
  for (const topic in topicToPushInfos) {
    requestsByTopic.push(
      (async () => {
        const prov = await getPushProvider(topic);
        const pushInfos = topicToPushInfos[topic];

        // run all the requests for this topic
        await Promise.all(
          pushInfos.map((pushInfo) => {
            return (async () => {
              const pushResponse = await prov.push(pushInfo);
              tokenToResponse[pushInfo.token] = pushResponse;
            })();
          })
        );
      })()
    );
  }

  await Promise.all(requestsByTopic);

  return tokenToResponse;
};
