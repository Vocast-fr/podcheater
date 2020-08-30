const checkInternetConnected = require('check-internet-connected')

const { getValueFromOH } = require('./utils')

const sleep = (seconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, 1000 * seconds)
  })

const sleepFromOhConfig = async (ohConfig) => {
  ohConfig = ohConfig || [{ oh: '24/7', seconds: '60' }]

  try {
    if (typeof ohConfig === 'string') {
      ohConfig = JSON.parse(ohConfig)
    }
  } catch (e) {
    console.error('cannot parse ohConfig')
  }

  const nbSecondsToWait = getValueFromOH(ohConfig, 'seconds', 60)
  await sleep(nbSecondsToWait)
}

const waitUntilConnection = async (desiredConnection) => {
  let connected = !desiredConnection
  while (connected !== desiredConnection) {
    await sleep(1)
    try {
      await checkInternetConnected({
        timeout: 2500, // timeout connecting to each server(A and AAAA), each try (default 5000)
        retries: 3, // number of retries to do before failing (default 5)
        domain: 'wikipedia.org' // the domain to check DNS record of
      })
      connected = true
    } catch (e) {
      connected = false
    }
  }
}

const waitUntilConnectionIsDown = () => waitUntilConnection(false)
const waitUntilConnectionIsUp = () => waitUntilConnection(true)

module.exports = {
  sleep,
  sleepFromOhConfig,
  waitUntilConnectionIsDown,
  waitUntilConnectionIsUp
}
