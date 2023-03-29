const Airtable = require('airtable');

const {
  ATCONF_API_KEY,
  ATCONF_BASE_ID,
  ATCONF_TABLE_ID,
} = process.env;

module.exports = {
  table: new Airtable({
    apiKey: ATCONF_API_KEY,
  }).base(ATCONF_BASE_ID).table(ATCONF_TABLE_ID),
};
