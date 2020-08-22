require('dotenv').config()

const { rebootModem } = require('./src/modem')
const { pickEpisodes } = require('./src/getEpisodes')

pickEpisodes().catch(console.error)

// for episode of episodes picked
//// get UA according OH
//// request 1 minute of data
//// insert (ip, ua, podcastTitle, episodeTitle, episodeDate, requestDate) into BQ

//rebootModem()

// wait according OH
