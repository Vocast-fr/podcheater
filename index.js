require('dotenv').config()

const { DEV, GOOGLE_CLOUD_PROJECT, MIN_NB_BYTES, WAIT } = process.env

const publicIp = require('public-ip')
const request = require('superagent')

const { rebootModem } = require('./lib/modem')
const pickEpisodes = require('./lib/pickEpisodes')
const pickUA = require('./lib/pickUA')
const { ddlPartOfBinary } = require('./lib/utils')
const {
  sleep,
  sleepFromOhConfig,
  waitUntilConnectionIsUp
} = require('./lib/wait')

const insertInBQ = GOOGLE_CLOUD_PROJECT ? require('./lib/insertInBQ') : null

const pickAndRequest = async () => {
  const IP = await publicIp.v4()
  const pickedEpisodes = await pickEpisodes()
  // const pickedUA = await pickUA()

  for (let i = 0; i < pickedEpisodes.length; i++) {
    const { episodeUrl, episodeTitle } = pickedEpisodes[i]
    try {
      // let's try another UA for each request ?
      const pickedUA = await pickUA()

      await ddlPartOfBinary(
        request.get(episodeUrl).set('User-Agent', pickedUA),
        MIN_NB_BYTES
      )
      Object.assign(pickedEpisodes[i], {
        requestDate: new Date(),
        IP,
        UA: pickedUA
      })
    } catch (e) {
      console.error(`cannot ddl ${episodeTitle}`, e)
    }
  }

  return pickedEpisodes.filter(({ requestDate }) => requestDate)
}

const unitProcess = async () => {
  try {
    const downloads = await pickAndRequest()
    if (!DEV && insertInBQ && downloads.length) await insertInBQ(downloads)
    if (!DEV) await rebootModem()
    await waitUntilConnectionIsUp()
    if (!DEV) {
      await sleepFromOhConfig(WAIT)
    } else {
      await sleep(10)
    }
  } catch (e) {
    console.error('Error in the unit process', e)
  }
}

const main = async () => {
  while (true) {
    await unitProcess()
  }
}

main().catch((e) => console.error('GLOBAL ERROR', e))
