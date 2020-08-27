require('dotenv').config()

const { GOOGLE_CLOUD_PROJECT, WAIT } = process.env

const { rebootModem } = require('./lib/modem')
const { pickAndRequest } = require('./lib/pickEpisodes')
const {
  sleep,
  sleepFromOhConfig,
  waitUntilConnectionIsUp
} = require('./lib/wait')
const insertInBQ = GOOGLE_CLOUD_PROJECT ? require('./lib/insertInBQ') : null

const unitProcess = async () => {
  try {
    const downloads = await pickAndRequest()

    // console.log({ downloads })

    if (insertInBQ && downloads.length) await insertInBQ(downloads)

    await rebootModem()
    await waitUntilConnectionIsUp()

    await sleepFromOhConfig(WAIT)

    // await sleep(10)
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
