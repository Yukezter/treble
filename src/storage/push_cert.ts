import * as db from "./db";

export const getPushCert = async (topic: string) => {
  return db.getItem<PushCert>(db.TABLES.PUSH_CERTS, topic, { key: "topic" });
};

export const isPushCertStale = async (topic: string, staleToken: number) => {
  const result = await db.getItem<Pick<PushCert, "staleToken">>(db.TABLES.PUSH_CERTS, topic, {
    key: "topic",
    ProjectionExpression: "staleToken",
  });

  return result?.staleToken !== staleToken;
};

export const storePushCert = async (topic: string, cert: string, key: string) => {
  const staleToken = Date.now();
  const data = { topic, cert, key, staleToken };
  await db.addItem(db.TABLES.PUSH_CERTS, data);
};

export const getPushInfos = async (ids: string[]) => {
  const result = await db.getItems<PushInfo>(db.TABLES.ENROLLMENTS, ids, {
    ProjectionExpression: "id, topic, pushMagic, #t",
    ExpressionAttributeNames: { "#t": "token" },
  });

  const pushInfos: Record<string, PushInfo> = {};

  if (!result) {
    return pushInfos;
  }

  result.forEach((pushInfo) => {
    pushInfos[pushInfo.id] = pushInfo;
  });

  return pushInfos;
};
