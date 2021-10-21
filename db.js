require('dotenv').config()
const { MongoClient } = require('mongodb')

let db

const connectToDb = async () => {
	const url = process.env.DB_URL || 'mongodb://localhost/issuetracker'
  const client = new MongoClient(url, { useNewUrlParser: true })
  await client.connect()
  console.log('Connected to MongoDB at', url)
  db = client.db()
}

const getNextSequence = async (name) => {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { current: 1 } },
    { returnOriginal: false },
  )
  return result.value.current
}

const getDb = () => db

module.exports = { connectToDb, getNextSequence, getDb }
