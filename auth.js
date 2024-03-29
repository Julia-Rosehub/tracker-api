const Router = require('express')
const bodyParser = require('body-parser')
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const { AuthenticationError } = require('apollo-server-express')

let { JWT_SECRET } = process.env

if (!JWT_SECRET) {
	if (process.env.NODE_ENV !== 'production') {
		JWT_SECRET = 'tempjwtsecretfordev'
		console.log('Missing env var JWT_SECRET. Using unsafe dev secret')
	} else {
		console.log('Missing env var JWT_SECRET. Authentication disabled')
	}
}

const routes = new Router()
routes.use(bodyParser.json())
const origin = process.env.UI_SERVER_ORIGIN || 'http://localhost:8000'
routes.use(cors({ origin, credentials: true }))

const getUser = (req) => {
	const token = req.cookies.jwt
	if (!token) return { signedIn: false }

	try {
		const credentials = jwt.verify(token, JWT_SECRET)
		return credentials
	} catch (error) {
		return { signedIn: false }
	}
}

routes.post('/signin', async (req, res) => {
	if (!JWT_SECRET) {
		res.status(500).send('Missing JWT_SECRET. Refusing to authenticate')
	}
	const googleToken = req.body.google_token
	if (!googleToken) {
		res.status(400).send({ code: 400, message: 'Missing Token' })
		return
	}

	const client = new OAuth2Client()
	let payload
	try {
		const ticket = await client.verifyIdToken({ idToken: googleToken })
		payload = ticket.getPayload()
	} catch (error) {
		res.status(403).send('Invalid credentials')
	}

	const { given_name: givenName, name, email } = payload
	const credentials = {
		signedIn: true, givenName, name, email,
	}

	const token = jwt.sign(credentials, JWT_SECRET)
	res.cookie('jwt', token, { httpOnly: true })
	res.json(credentials)
})

routes.post('/signout', (req, res) => {
  res.clearCookie('jwt')
  res.json({ status: 'ok' })
})

routes.post('/user', (req, res) => {
	res.send(getUser(req))
})

const mustBeSignedIn = (resolver) => (root, args, { user }) => {
		if (!user || !user.signedIn) {
			throw new AuthenticationError('You must be signed in')
		}
		return resolver(root, args, { user })
	}

const resolveUser = (_, args, { user }) => user

module.exports = {
	routes,
	getUser,
	mustBeSignedIn,
	resolveUser,
}
