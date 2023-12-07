import { Dyna, Model } from './index'

const tableName = 'test'
const model: Model = {
  user: {
    key: 'user_id',
  },
  group: {
    key: 'group_id',
    has: 'user',
  }
}

type User = {
  user_id: string,
  name: string,
  age: number,
}

type Group = {
  group_id: string,
  name: string,
}

const dyna = new Dyna(tableName, model)
const user = dyna.entity<User>('user')
const group = dyna.entity<Group>('group')
const belonging = dyna.relation<Group, User>('group', 'user')

test('should put entity', async () => {
  await user.put({user_id: 'user1', name: 'kamata', age: 38 })
})

test('should get entity', async () => {
  await user.put({ user_id: 'user2', name: 'kamata2', age: 39 })
  const kamata2 = await user.get('user2')
  expect(kamata2!.name).toEqual('kamata2')
})

test('should list entitys', async () => {
  await user.put({ user_id: 'user3', name: 'kamata3', age: 40 })
  await user.put({ user_id: 'user4', name: 'kamata4', age: 41 })
  await group.put({ group_id: 'hello', name: 'hello-G' })
  await belonging.put('hello', 'user3')
  await belonging.put('hello', 'user4')
  const users = await user.list('group', 'hello')
  expect(users).toHaveLength(2)
})

test('should delete relation', async () => {
  await user.put({ user_id: 'user5', name: 'kamata5', age: 42 })
  await group.put({ group_id: 'hello2', name: 'hello2-G' })
  await belonging.put('hello2', 'user5')
  await belonging.del('hello2', 'user5')
  const users = await user.list('group', 'hello2')
  expect(users).toHaveLength(0)
})

test('should delete entity', async () => {
  await user.put({ user_id: 'user6', name: 'kamata6', age: 43 })
  await user.del('user6')
  const kamata6 = await user.get('user6')
  expect(kamata6).toBeNull()
})
