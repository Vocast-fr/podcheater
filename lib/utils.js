const { SimpleOpeningHours } = require('simple-opening-hours')

const fs = require('fs')

const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const getValueFromOH = (values, key, defaultValue) => {
  let returnedValue = defaultValue

  try {
    for (const item of values) {
      const { oh } = item
      if (oh) {
        const ohtesterItem = new SimpleOpeningHours(oh)
        if (ohtesterItem.isOpenNow()) {
          returnedValue = item[key]
          break
        }
      }
    }
  } catch (e) {
    console.error('invalid values config', values)
    returnedValue = defaultValue
  }
  return returnedValue
}

const ddlPartOfBinary = async (request, nbBytes = 1500000) => {
  const tmpPath = `${new Date().valueOf()}.mp3`
  const stream = fs.createWriteStream(tmpPath)

  let downloaded = 0

  const execReq = () =>
    new Promise((resolve, reject) => {
      stream.on('finish', () => {
        stream.close()
      })
      stream.on('close', () => {
        resolve()
      })
      stream.on('error', (e) => {
        resolve()
      })

      request
        .on('end', (end) => {
          stream.close()
        })
        .on('abort', () => {
          stream.close()
        })
        .on('error', (e) => {
          stream.close()
        })
        .on('response', async (response) => {
          try {
            response.on('data', (chunk) => {
              downloaded += chunk.length
              if (downloaded > nbBytes) {
                request.abort()
              }
            })
          } catch (e) {
            console.error('on request response error', e)
            stream.close()
          }
        })
        .pipe(stream)
    })

  await execReq()
  fs.unlinkSync(tmpPath)
}

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

module.exports = {
  ddlPartOfBinary,
  getRandomIntInclusive,
  getValueFromOH,
  sleep,
  sleepFromOhConfig
}
