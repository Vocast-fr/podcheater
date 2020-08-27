/* eslint-disable indent */
const deepcopy = require('deepcopy')
const convert = require('xml-js')
const moment = require('moment')
const publicIp = require('public-ip')
const selectorFactory = require('random-selector')
const request = require('superagent')

const { ddlPartOfBinary, getRandomIntInclusive } = require('./utils')
const pickUA = require('./pickUA')

const { FEEDS, MAX_NB_ITEMS, MIN_NB_BYTES } = process.env

const maxItemsNb = Number.isInteger(Number(MAX_NB_ITEMS))
  ? Number(MAX_NB_ITEMS)
  : 10

const feedsCache = {}

const getAllFeedEpisodes = async (feedUrl) => {
  if (
    !feedsCache[feedUrl] ||
    !feedsCache[feedUrl].fetchedDate ||
    !feedsCache[feedUrl].data ||
    moment(feedsCache[feedUrl].fetchedDate).add('1', 'hour').isBefore(moment())
  ) {
    const res = await request.get(feedUrl)
    const xmlFeed = res.text
      ? res.text
      : Buffer.isBuffer(res.body)
      ? res.body.toString()
      : res.body
    const {
      rss: {
        channel: { title, item }
      }
    } = JSON.parse(convert.xml2json(xmlFeed, { compact: true, spaces: 4 }))

    const podcastTitle = title._text
    const episodes = item.map(({ title, pubDate, enclosure }) => ({
      episodeTitle: title._text ? title._text : title._cdata,
      episodeDate: new Date(pubDate._text),
      episodeUrl: enclosure._attributes.url
    }))

    feedsCache[feedUrl] = deepcopy({
      fetchedDate: new Date(),
      data: { episodes, podcastTitle }
    })
    return deepcopy({ episodes, podcastTitle })
  } else {
    const {
      data: { episodes, podcastTitle }
    } = feedsCache[feedUrl]
    return deepcopy({ episodes, podcastTitle })
  }
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

  const processFeed = async (feed) => {
    const { podcastTitle, episodes } = await getAllFeedEpisodes(feed)

    const nbEpisodes = episodes.length

    // add some null urls for random no requests
    const randomNonRequestsNb = getRandomIntInclusive(1, nbEpisodes)
    for (let i = 0; i < randomNonRequestsNb; i++) {
      const randomDate = moment().subtract(
        getRandomIntInclusive(1, 500), // frequencies between 1 and 500 days old
        'days'
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
    // expected 50% of chances it's a single download, 25% for 2 downloads, etc.
    const maxNumber = nbEpisodes < maxItemsNb ? nbEpisodes : maxItemsNb
    const pickedNbSelector = selectorFactory.createFrequencySelectorWithReplacement(
      Array.from({ length: maxNumber }, (_v, i) => [
        i + 1,
        Math.pow(2, maxNumber - 1 - i)
      ])
    )
    const pickedNb = pickedNbSelector.select()

    // select episodes
    for (let i = 0; i < pickedNb; i++) {
      const selected = episodeSelector.select()
      if (selected) pickedEpisodes.push(selected[0])
    }
  }

  /*
  for (const feed of feeds) {
    await processFeed(feed)
  }
  */
  await Promise.all(feeds.map(processFeed))

  pickedEpisodes = pickedEpisodes.filter((el) => el && el.episodeUrl)

  return pickedEpisodes
}

const pickAndRequest = async () => {
  const IP = await publicIp.v4()
  const pickedEpisodes = await pickEpisodes()

  // sometimes all requests with sameuser agent, sometimes different UA... (50%-50%)
  const globalPickedUA = Math.random() > 0.5 ? await pickUA() : null

  const processForOneEpisode = async (episode, i) => {
    const { episodeUrl, episodeTitle } = pickedEpisodes[i]
    try {
      const pickedUA = globalPickedUA || (await pickUA())

      await ddlPartOfBinary(
        request.get(episodeUrl).set('User-Agent', pickedUA),
        MIN_NB_BYTES
      )
      Object.assign(pickedEpisodes[i], {
        requestDate: new Date(),
        IP,
        UA: pickedUA
      })
    } catch (e) {
      console.error(`cannot ddl ${episodeTitle}`, e)
    }
  }

  /*
  for (let i = 0; i < pickedEpisodes.length; i++) {
   await processForOneEpisode(pickedEpisode[i], i)
  }
  */
  await Promise.all(pickedEpisodes.map(processForOneEpisode))

  return pickedEpisodes.filter(({ requestDate }) => requestDate)
}

module.exports = { pickEpisodes, pickAndRequest }
