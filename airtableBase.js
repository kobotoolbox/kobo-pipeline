const Airtable = require('airtable');
const {
  AIRTABLE_KEY,
  AIRTABLE_BASE_ID,
  AT_TABLE_ID,
  AT_VIEW_ID,
} = process.env;

const table = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE_ID).table(AT_TABLE_ID);

module.exports = {
  table,
  viewId: AT_VIEW_ID,
};
