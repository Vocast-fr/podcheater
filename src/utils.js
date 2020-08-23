const { SimpleOpeningHours } = require('simple-opening-hours')

const fs = require('fs')

const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const getValueFromOH = (values, key, defaultValue) => {
  let returnedValue = defaultValue

  for (const item of values) {
    const { oh } = item
    const ohtesterItem = new SimpleOpeningHours(oh)
    if (ohtesterItem.isOpenNow()) {
      returnedValue = item[key]
      break
    }
  }
  return returnedValue
}

const ddlPartOfBinary = async (request, nbBytes = 1500000) => {
  const tmpPath = `${new Date().valueOf()}.mp3`
  const stream = fs.createWriteStream(tmpPath)

  let downloaded = 0

  const execReq = () =>
    new Promise((resolve) => {
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
          response.on('data', (chunk) => {
            downloaded += chunk.length
            if (downloaded > nbBytes) {
              request.abort()
            }
          })
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
