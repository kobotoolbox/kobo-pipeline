const { AT } = require('./constants');

const sendUpdatesToAirtable = (base, updates) => {
  return new Promise((success, fail) => {
    base(AT.TABLE_NAME).update(updates, function (err, records) {
      if (err) { console.error(err); return fail(err); }
      success(records);
    });
  });
}

module.exports = { sendUpdatesToAirtable };
