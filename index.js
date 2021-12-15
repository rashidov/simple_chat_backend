require('dotenv').config()
const express = require('express')
const app = express()
const server = require('http').Server(app)
const cors = require('cors')
const useSocket =  require('socket.io')
const bodyParser = require('body-parser')
const PORT = process.env.APP_PORT

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

const rooms = new Map()

app.post('/rooms', (req, res) => {
  const {roomId} = req.body
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map([
      ['users', new Map()],
      ['messages', []]
    ]))
  }
  res.send()
})

const io = useSocket(server, {
  cors: {
    origin: "http://localhost:3000"
  }
})

io.on('connection', async socket => {

  socket.on('ROOM:JOIN', ({ roomId, userName}) => {
    socket.join(roomId)
    rooms.get(roomId).get('users').set(socket.id, userName);
    const users = [...rooms.get(roomId).get('users').values()];
    const messages = [...rooms.get(roomId).get('messages').values()];

    socket.to(roomId).emit('ROOM:JOINED', users)
    socket.emit('ROOM:JOINED', users)
    socket.emit('ROOM:MESSAGES', messages)
  })

  socket.on('ROOM:NEW_MESSAGE', ({ roomId, userName, text}) => {
    const msg = {userName, text}
    rooms.get(roomId).get('messages').unshift(msg)
    socket.to(roomId).emit('ROOM:NEW_MESSAGE', msg)
  })

  socket.on('disconnect', () => {
    rooms.forEach((value, roomId) => {
      if (value.get('users').delete(socket.id)) {
        const users = [...value.get('users').values()]
        socket.to(roomId).emit('ROOM:JOINED', users)
      }
    })
  })
})

server.listen(PORT, () => {
  console.log('server is started! port ->', PORT)
})