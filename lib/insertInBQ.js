const { BigQuery } = require('@google-cloud/bigquery')
const { BQ_DATASET_ID, BQ_TABLE_ID, GOOGLE_CLOUD_PROJECT } = process.env

const bigquery = new BigQuery({
  projectId: GOOGLE_CLOUD_PROJECT,
  keyFilename: './gcloud_service_account.json'
})

const insertRowsAsStream = async (rows) => {
  if (rows && rows.length && BQ_DATASET_ID && BQ_TABLE_ID) {
    await bigquery.dataset(BQ_DATASET_ID).table(BQ_TABLE_ID).insert(rows)
  }
}

module.exports = insertRowsAsStream
