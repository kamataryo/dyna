module.exports = {
  tables: [
    {
      TableName: 'test',
      KeySchema: [
        { AttributeName: '__PK', KeyType: 'HASH' },
        { AttributeName: '__SK', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: '__PK', AttributeType: 'S' },
        { AttributeName: '__SK', AttributeType: 'S' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    },
  ],
};
