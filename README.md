# podcheater

Use 4G modem and different user agents to get fake certified podcast downloads

## What it does

The process runs a loop following this scenario :

1. Get several episodes' information from input podcasts feeds. A random number of items are picked. The more recent the content is, the more probabilities it has to get chosen. The more episodes published dates are ancient, the less number of picked items are.

2. Select user agents from [WhatIsMyBrowser API](https://developers.whatismybrowser.com/), according expected frequencies of app usage (configured with `UA_PROP` environment variable).

3. Request the picked episodes with select user agents. Request only a part of the file (`MIN_NB_BYTES` environment variable), and then abort.

4. Reboot the modem with device API, to get a new IP address

5. Wait internet is up, and then wait again a specific amount of time according the configuration with `WAIT` environment variable.

## Requirements

- Device with NodeJS installed
- Huawei 4G Modem connected to the device, with a valid SIM inside. **Need a generous mobile plan**... (in France there are cheap ones !). Tested with [HUAWEI LTE USB Stick E3372](https://www.amazon.fr/Huawei-E3372-Adaptateur-r%C3%A9seau-150MBps/dp/B0104LV06M), on [Free Mobile](http://mobile.free.fr/) network.
- [WhatIsMyBrowser API Key (pro plan)](https://developers.whatismybrowser.com/api/pricing/)

## Configuration

A valid `.env` is required

`cp .env_example .env`

### FEEDS (required)

Array of podcasts' feeds urls to request to.

### MAX_NB_ITEMS (optionnal, default = 10)

Maximum number of items the process should download during a single iteration

### MODEM_IP (required)

This is the IP address related to the Huawei modem's API. It seems to be `192.168.8.1` in many cases.

### WIMB_KEY (required)

API key from WhatIsMyBrowser to get access to specific User-Agent. Once logged, get it from [here](https://accounts.whatismybrowser.com/admin/applications/)

### MIN_NB_BYTES (required)

The minimum amount of episode data to download, for each request. Set for example to 1500000 bytes, as [IAB asks to ignore downloads with less than 60 seconds transferred](https://iabtechlab.com/wp-content/uploads/2017/12/Podcast_Measurement_v2-Dec-20-2017.pdf).

### UA_PROP (required)

Inline JSON array providing User-Agent frequencies, according times of the day/week (provided with `oh` value, following [`opening_hours`](https://wiki.openstreetmap.org/wiki/Key:opening_hours) specification).

The one provided in the `.env_example` is valid.

The `frequencies` key provides the [WhatIsMyBrowser's database search parameters](https://developers.whatismybrowser.com/api/docs/v2/integration-guide/#user-agent-database-search) for the first element, and the desired probabilities for the second element.

```
[
  {
    // Here "24/7" means "all time". "oh" could be "10:00-13:00" to express from 10am to 1pm for example
    "oh":"24/7",

    "frequencies":[

      // target 48% of requests with Apple Podcast User-Agent
      [
        {
          "software_name":"Apple Podcast App"
        },
        48
      ],


      // target 13% of requests with Spotify on mobile User-Agent
      [
        {
          "software_name":"Spotify",
          "hardware_type":"mobile"
        },
        13
      ],

      // target 11% of requests with Spotify on computer User-Agent
      [
        {
          "software_name":"Spotify",
          "hardware_type":"computer"
        },
        11
      ],

      // target 11% of requests with a browser User-Agent
      [
        {
          "software_type":"browser"
        },
        11
      ],

      // target 9% of requests with a User-Agent from any media player (ffmpeg, Roku, ...)
      [
        {
          "software_type": "application",
          "software_type_specific":"media-player"
        },
        9
      ],

      // and so on, for Castbox, iTunes, Alexa, Google Assistant
      [{"software_name":"CastBox"},4],
      [{"software_name":"iTunes"},2],
      [{"software_name":"Alexa Media Player"},1],
      [{"software_name":"Google Assistant"},1]

    ]
  }
]
```

### WAIT (required)

Inline JSON array providing the number of seconds between each single process execution, according hours of the day (provided with `oh` value, following [`opening_hours`](https://wiki.openstreetmap.org/wiki/Key:opening_hours) specification).

The one provided in the `.env_example` is valid.

The `frequencies` key provides the desired number of seconds.

`Example with WAIT=[{"oh":"Mo-Fr 10:00-13:00", "seconds": "60"}, {"oh":"24/7", "seconds": "200"}]`

```
[
  // If actual time is in working weekdays from 10am to 1pm, wait 60 seconds (1 minute)
  {
    "oh":"Mo-Fr 10:00-13:00",
    "seconds": "60"
  },

  // for others timeslots, default = 200 seconds (24/7 = "all time")
  {
    "oh":"24/7",
    "seconds": "200"
  }
]
```

### BQ_DATASET_ID (not required)

If a valid download needs to be recorded in a Google BigQuery table, set the dataset id

### BQ_TABLE_ID (not required)

If a valid download needs to be recorded in a Google BigQuery table, set the table id

| fieldName    | type      | mode     |
| ------------ | --------- | -------- |
| requestDate  | TIMESTAMP | REQUIRED |
| podcastTitle | STRING    | NULLABLE |
| episodeTitle | STRING    | NULLABLE |
| episodeUrl   | STRING    | NULLABLE |
| episodeDate  | TIMESTAMP | NULLABLE |
| IP           | STRING    | NULLABLE |
| UA           | STRING    | NULLABLE |

Recommanded : Partitionned by day, by `requestDate`. Clustered by `IP, UA`

### GOOGLE_CLOUD_PROJECT (not required)

If a valid download needs to be recorded in a Google BigQuery table, set the GCP project id

### REQUEST_RESULTS_URL (not required)

If this environment variable is set, the process requests this URL and provides downloads values through `downloads` GET parameter.

```
// in GET query string parameters
downloads : [
  {
    requestDate: Date,
    podcastTitle: string,
    episodeTitle: string,,
    episodeUrl: string,
    episodeDate: string,
    IP: string,
    UA: string,
  }
]
```

### LOG (not required)

Verbose to see each executed steps.

## Run

`npm run start`

## What needs to be improved

- Another strategy to select user agent, free from WhatIsMyBrowser, and "smarter"
- Provide values from Deezer, and others podcast apps.
- User agent cleaning : replace language informations, ...
