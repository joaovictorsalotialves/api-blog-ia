import { createApp } from './app.js'

const { API_PORT, API_HOST, API_PROTOCOL } = process.env
const app = createApp()

app.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://${API_HOST}:${API_PORT}`)
  console.log('Press CTRL+C to stop')
})
