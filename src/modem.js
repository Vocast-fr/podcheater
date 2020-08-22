const request = require('superagent')
const convert = require('xml-js')

const { MODEM_IP } = process.env

const getCookieAndToken = async () => {
  const res = await request.get(`http://${MODEM_IP}/api/webserver/SesTokInfo`)
  const {
    response: { SesInfo, TokInfo }
  } = JSON.parse(convert.xml2json(res.text, { compact: true, spaces: 4 }))

  return { cookie: SesInfo._text, token: TokInfo._text }
}

const postDeviceControl = (cookie, token) =>
  request
    .post(`http://${MODEM_IP}/api/device/control`)
    .set('Cookie', cookie)
    .set('__RequestVerificationToken', token)
    .set('Content-Type', 'text/xml')
    .send(
      '<?xml version="1.0" encoding="UTF-8"?><request><Control>1</Control></request>'
    )

const rebootModem = async () => {
  const { cookie, token } = await getCookieAndToken()
  return postDeviceControl(cookie, token)
}

module.exports = {
  rebootModem
}
