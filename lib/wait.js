const internet = require('await-internet')

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

const waitUntilConnectionIsUp = () =>
  internet({
    // specify a list of custom test(s) (all must succceed)
    test: ['https://wikipedia.org'],

    // time (ms) to wait between back-to-back test rounds
    pause: 2000, // default

    // connection timeout before a single test case is considered failed
    timeout: 5000, // default

    // max time (ms) to wait for internet connection before rejecting the promise
    // (default: try forever)
    maxWait: 5 * 60 * 1000 // 5 min

    // max attempted test rounds before rejecting the promise
    // (default: try forever)
    // maxTries: 3
  })

module.exports = {
  sleep,
  sleepFromOhConfig,
  waitUntilConnectionIsUp
}
