const convert = require('xml-js')
const moment = require('moment')
const selectorFactory = require('random-selector')
const request = require('superagent')

const { getRandomIntInclusive } = require('./utils')

const { FEEDS } = process.env

const getAllFeedEpisodes = async (feedUrl) => {
  const res = await request.get(feedUrl)
  const xmlFeed = Buffer.isBuffer(res.body) ? res.body.toString() : res.body
  const {
    rss: {
      channel: { title, item }
    }
  } = JSON.parse(convert.xml2json(xmlFeed, { compact: true, spaces: 4 }))

  const podcastTitle = title._text
  const episodes = item.map(({ title, pubDate, enclosure }) => ({
    episodeTitle: title._text,
    episodeDate: new Date(pubDate._text),
    episodeUrl: enclosure._attributes.url
  }))

  return { episodes, podcastTitle }
}

const getFrequencyFromPubDate = (pubDate) => {
  const duration = moment.duration(moment().diff(moment(pubDate)))

  if (duration.asHours() < 1) {
    return 1000 - duration.asMinutes()
  } else if (duration.asDays() < 1) {
    return 500 - duration.asHours()
  } else if (duration.asWeeks() < 1) {
    return 250 - duration.asDays()
  } else if (duration.asMonths() < 1) {
    return 100 - duration.asWeeks()
  } else if (duration.asYears() < 1) {
    return 75 - duration.asWeeks()
  } else {
    return 10 - duration.asYears() <= 0 ? 1 : 10 - duration.asYears()
  }
}

/************************************
 * Returns array of episode elements:
 {
   podcastTitle: string,
   episodeTitle: string,
   episodeDate: Date,
   episodeUrl: string
 }
 **********************************/
const pickEpisodes = async () => {
  const feeds = JSON.parse(FEEDS)
  let pickedEpisodes = []

  for (const feed of feeds) {
    const { podcastTitle, episodes } = await getAllFeedEpisodes(feed)

    const nbEpisodes = episodes.length

    // add some null urls for random no requests
    const randomNonRequestsNb = getRandomIntInclusive(1, nbEpisodes)
    for (let i = 0; i < randomNonRequestsNb; i++) {
      const randomStart = moment().subtract(
        getRandomIntInclusive(1, 100),
        'weeks'
      )
      const randomEnd = moment()
      const randomDate = moment(
        getRandomIntInclusive(randomStart.valueOf(), randomEnd.valueOf())
      )
      episodes.push({ episodeDate: randomDate.toJSON(), episodeUrl: null })
    }

    // the most recent items have more chances to get selected
    const selectEpisodeArray = episodes.map((episode) => [
      { podcastTitle, ...episode },
      Math.round(getFrequencyFromPubDate(episode.episodeDate))
    ])
    const episodeSelector = selectorFactory.createFrequencySelectorWithoutReplacement(
      selectEpisodeArray
    )

    // number of episodes picked
    const randomPickedNb = getRandomIntInclusive(1, nbEpisodes)
    for (let i = 0; i < randomPickedNb; i++) {
      const selected = episodeSelector.select()
      if (selected) pickedEpisodes.push(selected[0])
    }
  }

  pickedEpisodes = pickedEpisodes.filter((el) => el && el.episodeUrl)

  return pickedEpisodes
}

module.exports = pickEpisodes
