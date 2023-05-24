// TODO: add db tests
(async () => {})();

// Create table - Full Example

// const input = { // CreateTableInput
//   AttributeDefinitions: [ // AttributeDefinitions // required
//     { // AttributeDefinition
//       AttributeName: "STRING_VALUE", // required
//       AttributeType: "S" || "N" || "B", // required
//     },
//   ],
//   TableName: "STRING_VALUE", // required
//   KeySchema: [ // KeySchema // required
//     { // KeySchemaElement
//       AttributeName: "STRING_VALUE", // required
//       KeyType: "HASH" || "RANGE", // required
//     },
//   ],
//   LocalSecondaryIndexes: [ // LocalSecondaryIndexList
//     { // LocalSecondaryIndex
//       IndexName: "STRING_VALUE", // required
//       KeySchema: [ // required
//         {
//           AttributeName: "STRING_VALUE", // required
//           KeyType: "HASH" || "RANGE", // required
//         },
//       ],
//       Projection: { // Projection
//         ProjectionType: "ALL" || "KEYS_ONLY" || "INCLUDE",
//         NonKeyAttributes: [ // NonKeyAttributeNameList
//           "STRING_VALUE",
//         ],
//       },
//     },
//   ],
//   GlobalSecondaryIndexes: [ // GlobalSecondaryIndexList
//     { // GlobalSecondaryIndex
//       IndexName: "STRING_VALUE", // required
//       KeySchema: [ // required
//         {
//           AttributeName: "STRING_VALUE", // required
//           KeyType: "HASH" || "RANGE", // required
//         },
//       ],
//       Projection: {
//         ProjectionType: "ALL" || "KEYS_ONLY" || "INCLUDE",
//         NonKeyAttributes: [
//           "STRING_VALUE",
//         ],
//       },
//       ProvisionedThroughput: { // ProvisionedThroughput
//         ReadCapacityUnits: Number("long"), // required
//         WriteCapacityUnits: Number("long"), // required
//       },
//     },
//   ],
//   BillingMode: "PROVISIONED" || "PAY_PER_REQUEST",
//   ProvisionedThroughput: {
//     ReadCapacityUnits: Number("long"), // required
//     WriteCapacityUnits: Number("long"), // required
//   },
//   StreamSpecification: { // StreamSpecification
//     StreamEnabled: true || false, // required
//     StreamViewType: "NEW_IMAGE" || "OLD_IMAGE" || "NEW_AND_OLD_IMAGES" || "KEYS_ONLY",
//   },
//   SSESpecification: { // SSESpecification
//     Enabled: true || false,
//     SSEType: "AES256" || "KMS",
//     KMSMasterKeyId: "STRING_VALUE",
//   },
//   Tags: [ // TagList
//     { // Tag
//       Key: "STRING_VALUE", // required
//       Value: "STRING_VALUE", // required
//     },
//   ],
//   TableClass: "STANDARD" || "STANDARD_INFREQUENT_ACCESS",
//   DeletionProtectionEnabled: true || false,
// };
