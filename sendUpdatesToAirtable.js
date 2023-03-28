// const { AT } = require('./constants');
const { table } = require('./airtableBase');

const sendUpdatesToAirtable = (base, updates) => {
  return new Promise((success, fail) => {
    table.update(updates, function (err, records) {
      if (err) { console.error(err); return fail(err); }
      success(records);
    });
  });
}

module.exports = { sendUpdatesToAirtable };
