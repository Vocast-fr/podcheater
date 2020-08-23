require('dotenv').config()

const publicIp = require('public-ip')
const request = require('superagent')

const { ddlPartOfBinary } = require('./src/utils')
const { rebootModem } = require('./src/modem')
const pickEpisodes = require('./src/pickEpisodes')
const pickUA = require('./src/pickUA')

async function pickAndRequest() {
  const ip = await publicIp.v4()
  const pickedEpisodes = await pickEpisodes()
  const pickedUA = await pickUA()

  for (let i = 0; i < pickedEpisodes.length; i++) {
    const { episodeUrl, episodeTitle } = pickedEpisodes[i]
    // request 1 minute of data
    try {
      await ddlPartOfBinary(request.get(episodeUrl))
      Object.assign(pickedEpisodes[i], {
        requestDate: new Date(),
        ip,
        UA: pickedUA
      })
    } catch (e) {
      console.error(`cannot ddl ${episodeTitle}`, e)
    }
  }

  return pickedEpisodes.filter(({ requestDate }) => requestDate)
}

async function process() {
  const downloads = await pickAndRequest()
  console.log(downloads)
  //// insert (podcastTitle, episodeTitle, episodeDate, episodeUrl, requestDate, ip, ua) into BQ
  //rebootModem()
  // wait according OH
}

process().catch(console.error)
