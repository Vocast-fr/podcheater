const moment = require('moment')
const request = require('superagent')
const selectorFactory = require('random-selector')

const { getRandomIntInclusive, getValueFromOH } = require('./utils')

const { UA_PROP, WIMB_KEY } = process.env

const defaultUAProp = [
  {
    oh: '24/7',
    frequencies: [
      [
        {
          software_name: 'Apple Podcast App'
        },
        48
      ],
      [
        {
          software_name: 'Spotify',
          hardware_type: 'mobile'
        },
        13
      ],

      [
        {
          software_name: 'Spotify',
          hardware_type: 'computer'
        },
        11
      ],
      [
        {
          software_type: 'browser'
        },
        11
      ],
      [
        {
          software_type_specific: 'media-player'
        },
        9
      ],
      [
        {
          software_name: 'CastBox'
        },
        4
      ],
      [
        {
          software_name: 'iTunes'
        },
        2
      ],
      [
        {
          software_name: 'Alexa Media Player'
        },
        1
      ],
      [
        {
          software_name: 'Google Assistant'
        },
        1
      ]
    ]
  }
]

const wimbCacheValues = {}

const getWimbParams = () => {
  let uaProps
  try {
    uaProps = JSON.parse(UA_PROP)
  } catch (e) {
    console.error('Cannot get UA prop from env', e)
    uaProps = defaultUAProp
  }

  const uaFrequencies = getValueFromOH(
    uaProps,
    'frequencies',
    defaultUAProp.frequencies
  )

  let wimbParams
  while (!wimbParams) {
    const wimbParamsSelector = selectorFactory.createFrequencySelectorWithReplacement(
      uaFrequencies
    )
    wimbParams = wimbParamsSelector.select()
  }
  return wimbParams
}

const requestWimbSearch = async (wimbParams) => {
  const wimbResponse = await request
    .get('https://api.whatismybrowser.com/api/v2/user_agent_database_search')
    .query(wimbParams)
    .query({ order_by: 'times_seen desc', limit: 250 })
    .set('X-API-KEY', WIMB_KEY)
    .set('Content-Type', 'application/json')

  const searchResults = wimbResponse.body.search_results.user_agents
    .map(
      ({
        user_agent: userAgent,
        user_agent_meta_data: { last_seen_at: lastSeenAt }
      }) => ({
        userAgent,
        lastSeenAt
      })
    )
    .filter(
      ({ userAgent, lastSeenAt }) =>
        userAgent.indexOf('watchOS') < 0 && // IAB excludes downloads from Apple Watch
        moment(lastSeenAt).isAfter(moment().subtract(6, 'months'))
    )

  return searchResults
}

const pickUA = async () => {
  const wimbParams = getWimbParams()
  const encodedwimbParams = Buffer.from(JSON.stringify(wimbParams)).toString(
    'base64'
  )

  if (
    !wimbCacheValues[encodedwimbParams] ||
    !wimbCacheValues[encodedwimbParams].fetchedDate ||
    moment(wimbCacheValues[encodedwimbParams].fetchedDate).isBefore(
      moment().subtract(1, 'days')
    )
  ) {
    const searchResults = await requestWimbSearch(wimbParams)
    wimbCacheValues[encodedwimbParams] = {
      UAs: searchResults,
      fetchedDate: new Date()
    }
  }

  const selectedUA =
    wimbCacheValues[encodedwimbParams].UAs[
      getRandomIntInclusive(
        0,
        wimbCacheValues[encodedwimbParams].UAs.length - 1
      )
    ]

  return selectedUA.userAgent
}

module.exports = pickUA
