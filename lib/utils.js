const OpeningHoursFactory = require('opening_hours')

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
        const ohTesterItem = new OpeningHoursFactory(oh)
        const actualDateIsInHoursInterval = ohTesterItem.getState()
        if (actualDateIsInHoursInterval) {
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
  const tmpPath = `${new Date().valueOf()}-${Math.round(
    Math.random() * 100000
  )}.mp3`
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
        .timeout({
          response: 10000, // Wait 10 seconds for the server to start sending,
          deadline: 60000 // but allow 1 minute for the file to finish loading.
        })
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

module.exports = {
  ddlPartOfBinary,
  getRandomIntInclusive,
  getValueFromOH
}
