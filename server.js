require('dotenv').config()
const fs = require('fs')
const cookieParser = require('cookie-parser')
const express = require('express')
const { ApolloServer } = require('apollo-server-express')
const GraphQLDate = require('./graphql_date')
const { connectToDb } = require('./db')
const auth = require('./auth')
const issue = require('./issue');

(async function start() {
  try {
    await connectToDb()
  } catch (err) {
    console.log('ERROR:', err)
  }
}())

const typeDefs = fs.readFileSync('schema.graphql', 'utf-8')

const resolvers = {
  Query: {
    user: auth.resolveUser,
    issueList: issue.list,
    issue: issue.get,
    issueCounts: issue.counts,
  },
  Mutation: {
    issueAdd: issue.add,
    issueUpdate: issue.update,
    issueDelete: issue.delete,
  },
  GraphQLDate,
}

const getContext = ({ req }) => {
  const user = auth.getUser(req)
  return { user }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: getContext,
  formatError: (err) => {
    console.log(err)
    return err
  },
	playground: true,
  introspection: true,
})

const installHandler = (app) => {
  let cors
  const enableCors = (process.env.ENABLE_CORS || 'true') === 'true'
  if (enableCors) {
    const origin = process.env.UI_SERVER_ORIGIN || 'http://localhost:8000'
    const methods = 'POST'
    cors = { origin, methods, credentials: true }
    } else {
      cors = 'false'
    }
  server.applyMiddleware({ app, path: '/graphql', cors })
}

const startApolloServer = async () => {
  const app = express()
  app.use(cookieParser())
  app.use('/auth', auth.routes)
  await server.start()
  app.use(express.static('public'))

  installHandler(app)
	const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log('App started on port 3000')
  })
}

startApolloServer()
