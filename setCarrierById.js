const Airtable = require('airtable');
const { AT } = require('./constants');

// Airtable configs
const AIRTABLE_KEY = process.env.AIRTABLE_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

if (!AIRTABLE_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_KEY and AIRTABLE_BASE_ID ' +
                  'variables not set.')
}

const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE_ID);

const { getAirtableRecordIds } = require('./getAirtableRecordIds');
const { sendUpdatesToAirtable } = require('./sendUpdatesToAirtable');


function error (arg) {
  console.error(arg);
}

function setCarrierById (data) {
  return new Promise(function(success, fail) {
    let ids = [];
    let values = {};
    data.forEach(([id, carrier, phone]) => {
      ids.push(id);
      values[id] = {
        [AT.SPECIFIED_CARRIER]: carrier,
        [AT.PHONE_FOR_INCENTIVE]: phone,
      };
    });
    getAirtableRecordIds(base).then((atIds)=>{
      let updates = [];
      ids.forEach((partId) => {
        let recordId = atIds[partId];
        if (recordId) {
          updates.push({
            id: recordId,
            fields: values[partId],
          });
        }
      });
      sendUpdatesToAirtable(base, updates).then(()=>{
        console.log('successed');
      }).catch(error)
    }).catch(error);
  });
}

module.exports = {
  setCarrierById,
};
