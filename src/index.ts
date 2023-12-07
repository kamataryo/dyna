import type {
  GetCommandInput,
  DeleteCommandInput,
  PutCommandInput,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb"
import {DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"

export type Model = {
  [entity: string]: {
    key: string
    has?: keyof Model | (keyof Model)[]
  }
}

class DynaEntity<T> {
  constructor(
    private tableName: string,
    private __entity: keyof typeof model,
    private model: Model,
    private documentClient: DynamoDBDocumentClient,
  ) {
    if(__entity === '') {
      throw new Error(`'entity' cannot be empty`)
    } else if(!model[__entity]) {
      throw new Error(`'${__entity}' not found in model`)
    }
  }

  public async get(id: string) {
    const PK = [this.__entity, id].join(Dyna.$KEY_DELIM)
    const SK = Dyna.SELF_SORT_KEY_KEY_VALUE
    const getCommandInput: GetCommandInput = {
      TableName: this.tableName,
      Key: {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
      },
    }
    const getCommand = new GetCommand(getCommandInput)
    const { Item: item } = await this.documentClient.send(getCommand)
    if(item) {
      const {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
        ...rest
      } = item
      const id = PK.split(Dyna.$KEY_DELIM)[1]
      const key_name = this.model[this.__entity].key
      return {
        [key_name]: id,
        ...rest,
      } as T
    } else {
      return null
    }
  }

  public async list(
    by: keyof typeof this.model,
    id: string,
  ) {
    const child_entity = [this.model[this.__entity].has || []].flat()
    if(!child_entity.includes(by)) {
      throw new Error(`'${this.__entity}' has no '${by}'`)
    }
    const PK = [by, id].join(Dyna.$KEY_DELIM)
    const SK_prefix = [this.__entity, ''].join(Dyna.$KEY_DELIM)
    const queryCommandInput: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: `${Dyna.PARTITION_KEY_NAME} = :PK and begins_with(${Dyna.SORT_KEY_NAME}, :SK)`,
      ExpressionAttributeValues: {
        ':PK': PK,
        ':SK': SK_prefix,
      },
    }
    const queryCommand = new QueryCommand(queryCommandInput)
    const { Items: items = [] } = await this.documentClient.send(queryCommand)
    const key_name = this.model[this.__entity].key
    return items.map((item) => {
      const {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
        ...rest
      } = item
      const id = PK.split(Dyna.$KEY_DELIM)[1]
      return {
        [key_name]: id,
        ...rest,
      } as T
    })
  }

  public async put(data: T) {
    const key_name = this.model[this.__entity].key
    // @ts-ignore
    const id = data[key_name] as string
    // @ts-ignore
    delete data[key_name]
    const PK = [this.__entity, id].join(Dyna.$KEY_DELIM)
    const SK = Dyna.SELF_SORT_KEY_KEY_VALUE
    const putCommandInput: PutCommandInput = {
      TableName: this.tableName,
      Item: {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
        ...data,
      },
    }
    const putCommand = new PutCommand(putCommandInput)
    await this.documentClient.send(putCommand)
  }

  public async del(id: string) {
    const PK = [this.__entity, id].join(Dyna.$KEY_DELIM)
    const SK = Dyna.SELF_SORT_KEY_KEY_VALUE
    const deleteCommandInput: DeleteCommandInput = {
      TableName: this.tableName,
      Key: {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
      },
    }
    const deleteCommand = new DeleteCommand(deleteCommandInput)
    await this.documentClient.send(deleteCommand)
  }
}

export class DynaRelation<T1, T2> {
  constructor(
    private tableName: string,
    private __entity1: keyof typeof model,
    private __entity2: keyof typeof model,
    private model: Model,
    private documentClient: DynamoDBDocumentClient,
  ) {
    if(__entity1 === '' || __entity2 === '') {
      throw new Error(`'entity' cannot be empty`)
    } else if(!model[__entity1] || !model[__entity2]) {
      throw new Error(`'${__entity1}' or '${__entity2}' not found in model`)
    }
  }

  public async put(id1: string, id2: string) {
    const PK = [this.__entity1, id1].join(Dyna.$KEY_DELIM)
    const SK = [this.__entity2, id2].join(Dyna.$KEY_DELIM)
    const putCommandInput: PutCommandInput = {
      TableName: this.tableName,
      Item: {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
      },
    }
    const putCommand = new PutCommand(putCommandInput)
    await this.documentClient.send(putCommand)
  }

  public async del(id1: string, id2: string) {
    const PK = [this.__entity1, id1].join(Dyna.$KEY_DELIM)
    const SK = [this.__entity2, id2].join(Dyna.$KEY_DELIM)
    const deleteCommandInput: DeleteCommandInput = {
      TableName: this.tableName,
      Key: {
        [Dyna.PARTITION_KEY_NAME]: PK,
        [Dyna.SORT_KEY_NAME]: SK,
      },
    }
    const deleteCommand = new DeleteCommand(deleteCommandInput)
    await this.documentClient.send(deleteCommand)
  }
}

export class Dyna {
  static SELF_SORT_KEY_KEY_VALUE = '__self'
  static PARTITION_KEY_NAME = '__PK'
  static SORT_KEY_NAME = '__SK'
  static $KEY_DELIM = '#'

  private documentClient: DynamoDBDocumentClient
  constructor(
    private tableName: string,
    private model: Model,
    dynamodbConfig: [DynamoDBClientConfig] | [] = []
  ) {
    const client = new DynamoDBClient(...dynamodbConfig)
    this.documentClient = DynamoDBDocumentClient.from(client)
  }

  public entity<T = any>(name: keyof typeof this.model) {
    return new DynaEntity<T>(
      this.tableName,
      name,
      this.model,
      this.documentClient,
    )
  }

  public relation<T1 = any, T2 = any>(
    entity1: keyof typeof this.model,
    entity2: keyof typeof this.model,
  ) {
  return new DynaRelation<T1, T2>(
    this.tableName,
    entity1,
    entity2,
    this.model,
    this.documentClient,
    )
  }
}
