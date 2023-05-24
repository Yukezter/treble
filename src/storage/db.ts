import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { generateUpdateExpr } from "../helpers/db";

// TODO: handle database errors with informative responses

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
const credentials = {
  accessKeyId: AWS_ACCESS_KEY_ID || "XXXXXXXXXXXXXXX",
  secretAccessKey: AWS_SECRET_ACCESS_KEY || "XXXXXXXXXXXXXXXXXXXXXX",
};

export const ddbClient = new DynamoDBClient({
  region: "us-west-2",
  endpoint: "http://host.docker.internal:8000",
  credentials,
});

export const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export enum TABLES {
  PUSH_CERTS = "PushCerts",
  PUSH_INFOS = "PushInfos",
  DEVICES = "Devices",
  USERS = "Users",
  ENROLLMENTS = "Enrollments",
}

type Opts = {
  key?: string;
  ProjectionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
};

export const createTable = async (tableName: string, key = "id") => {
  const command = new CreateTableCommand({
    AttributeDefinitions: [
      {
        AttributeName: key,
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: key,
        KeyType: "HASH",
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    TableName: tableName,
  });

  const response = await ddbClient.send(command);
  return response;
};

export const deleteTable = async (tableName: string) => {
  try {
    await ddbClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
    // console.log("Success - table deleted");
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getTables = async () => {
  try {
    const result = await ddbDocClient.send(new ListTablesCommand({}));

    // console.log(result);

    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getTable = async (tableName: string) => {
  try {
    const result = await ddbDocClient.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );

    // console.log("Success -", result?.Table);

    return result.Table;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const createTableIfNone = async (tableName: string, key = "id") => {
  try {
    const result = await ddbDocClient.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );

    // console.log("Success -", result?.Table);

    return result.Table;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      await createTable(tableName, key);
    } else {
      console.error(err);
      throw err;
    }
  }
};

export const addItem = async (tableName: string, data: Record<string, any>) => {
  try {
    const result = await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: data,
      })
    );

    // console.log("Success - item added or updated", result);

    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const updateItem = async <T>(
  tableName: string,
  id: string,
  data: Partial<T>,
  opts: Opts = {}
) => {
  try {
    const { key = "id" } = opts;
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { [key]: id },
        ...generateUpdateExpr(data),
      })
    );

    // console.log("Success - item added or updated", result);

    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getItem = async <T>(tableName: string, id: string, opts: Opts = {}) => {
  try {
    const { key = "id", ...rest } = opts;
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { [key]: id },
        ...rest,
      })
    );

    // console.log("Success :", result.Item);

    return result.Item as T;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getItems = async <T>(tableName: string, ids: string[], opts: Opts = {}) => {
  try {
    const { key = "id", ...rest } = opts;
    const result = await ddbDocClient.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: ids.map((id) => ({ [key]: id })),
            ...rest,
          },
        },
      })
    );

    // console.log("Success :", result.Responses);

    if (!result.Responses) {
      return undefined;
    }

    return result.Responses[tableName] as T[];
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getAllItems = async <T>(tableName: string) => {
  try {
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    // console.log("Success :", result.Items);

    return result.Items as T[] | undefined;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const deleteItem = async (tableName: string, id = "id") => {
  try {
    const result = await ddbDocClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id },
      })
    );

    // console.log("Success - item deleted");

    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

(async () => {
  await createTableIfNone(TABLES.PUSH_CERTS, "topic");
  await createTableIfNone(TABLES.ENROLLMENTS);
  await createTableIfNone(TABLES.DEVICES);
  await createTableIfNone(TABLES.USERS);
})();
