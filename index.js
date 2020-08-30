require('dotenv').config()

const request = require('superagent')

const { GOOGLE_CLOUD_PROJECT, LOG, REQUEST_RESULTS_URL, WAIT } = process.env

const { rebootModem } = require('./lib/modem')
const { pickAndRequest } = require('./lib/pickEpisodes')
const {
  sleepFromOhConfig,
  waitUntilConnectionIsDown,
  waitUntilConnectionIsUp
} = require('./lib/wait')
const insertInBQ = GOOGLE_CLOUD_PROJECT ? require('./lib/insertInBQ') : null

const log = (...args) => {
  if (LOG) console.log(new Date(), ...args)
}

const unitProcess = async () => {
  try {
    console.time('Unit loop')
    log('Pick and request...')
    const downloads = await pickAndRequest()

    log(
      `Downloads process done. Requested ${downloads.length} elements. Store them if needed...`
    )
    try {
      if (insertInBQ && downloads.length) await insertInBQ(downloads)
      if (REQUEST_RESULTS_URL) {
        await request.get(REQUEST_RESULTS_URL).query({ downloads })
      }
    } catch (e) {
      console.error('Error storing data', e)
    }

    log('Reboot modem... and wait until connection is down...')
    await rebootModem()
    await waitUntilConnectionIsDown()

    log('Connection down. Wait until connection is up again...')
    await waitUntilConnectionIsUp()
    log(
      'Connection is up again ! Loop after waiting as expected in the config.'
    )
    if (LOG) {
      console.timeEnd('Unit loop')
      console.log()
    }

    await sleepFromOhConfig(WAIT)
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
