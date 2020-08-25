# podcheater

Use 4G modem and different user agents to get fake certified podcast downloads

## What it does

The process runs a loop following this scenario :

1. Get several episodes' information from input podcasts feeds. A random number of items are picked. The more recent the content is, the more probabilities it has to get chosen. The more episodes published dates are ancient, the less number of picked items are.

2. Select an user agent from [WhatIsMyBrowser API](https://developers.whatismybrowser.com/), according expected frequencies of app usage (configured with `UA_PROP` environment variable).

3. Request the picked episodes with the fake user agent. Request only a part of the file (`MIN_NB_BYTES` environment variable), and then abort.

4. Reboot the modem with device API, to get a new IP address

5. Wait a specific amount of time according the configuration with `WAIT` environment variable.

## Requirements

- Device with NodeJS installed
- Huawei 4G Modem connected to the device, with a valid SIM inside. **Need a generous mobile plan**... (in France there are cheap ones !). Tested with [HUAWEI LTE USB Stick E3372](https://www.amazon.fr/Huawei-E3372-Adaptateur-r%C3%A9seau-150MBps/dp/B0104LV06M), on [Free Mobile](http://mobile.free.fr/) network.
- [WhatIsMyBrowser API Key (pro plan)](https://developers.whatismybrowser.com/api/pricing/)

## Configuration

A valid `.env` is required

`cp .env_example .env`

### BQ_DATASET_ID (not required)

If a valid podcast download needs to be recorded in a Google BigQuery table, set the dataset id

### BQ_TABLE_ID (not required)

If a valid podcast download needs to be recorded in a Google BigQuery table, set the table id

### GOOGLE_CLOUD_PROJECT (not required)

If a valid podcast download needs to be recorded in a Google BigQuery table, set the GCP project id

### MODEM_IP (required)

This is the IP address related to the Huawei modem's API. It seems to be `192.168.8.1` in many cases.

### FEEDS (required)

Array of podcasts' feeds urls to request to.

### MAX_NB_ITEMS (optionnal, default = 10)

Maximum number of items the process should download during a single iteration

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

`Example with WAIT=[{"oh":"02:00-07:00", "seconds": "600"}, {"oh":"24/7", "seconds": "45"}]`

```
[
  // If working weekdays from 10am to 1pm, wait 60 seconds (1 minute)
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

### WIMB_KEY (not required)

API key from WhatIsMyBrowser to get access to specific User-Agent. Once logged, get it from [here](https://accounts.whatismybrowser.com/admin/applications/)

## Run

`npm run start`
