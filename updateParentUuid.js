// FIXME: this whole thing should probably use the Airtable library instead of
// raw HTTP requests. originally, this was to be shoehorned into index.js,
// which uses raw HTTP only

const https = require('https');
const { AT } = require('./constants');

// Airtable configs
const AIRTABLE_KEY = process.env.AIRTABLE_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

// FIXME: do not hardcode(?)
// we follow the index.js example for now
const DOC_ID = "Respondent%20tracker";

if (!AIRTABLE_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_KEY and AIRTABLE_BASE_ID ' +
                  'variables not set.')
}

const airtableBaseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${DOC_ID}`;
const airtableHeaders = {
  'Authorization': `Bearer ${AIRTABLE_KEY}`,
  'Content-Type': 'application/json',
};

function writeNewUuid(airtableRecordId, newUuid) {
  const updateUrl = new URL(`${airtableBaseUrl}/${airtableRecordId}`);
  const fields = {};
  fields[AT.PARENT_UUID] = newUuid;
  const data = JSON.stringify({fields});
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    ...airtableHeaders
  }
  const req = https.request(updateUrl, {method: 'PATCH', headers}, (res) => {
    res.on('data', (d) => {
      if (res.statusCode !== 200) {
        req.emit('error', d.toString());
        return;
      }
      console.log(`Successfully updated parent uuid to ${newUuid} for record ${airtableRecordId}`)
    });
  });
  req.on('error', e => {
    console.error('Failed to update parent uuid in Airtable:', e)
  });
  req.write(data);
  req.end()
}

function updateParentUuid(participantId, newUuid) {
  return new Promise((success, fail)=>{
    const queryUrl = new URL(airtableBaseUrl);
    queryUrl.searchParams.append('fields[]', AT.PARENT_UUID);
    queryUrl.searchParams.append('fields[]', AT.ID_OF_PARTICIPANT);
    queryUrl.searchParams.set('filterByFormula', `{${AT.ID_OF_PARTICIPANT}} = ${participantId}`);
    const req = https.request(queryUrl, {method: 'GET', headers: airtableHeaders}, (res) => {
      res.on('data', (d) => {
        if (res.statusCode !== 200) {
          req.emit('error', d.toString());
          return;
        }
        const records = JSON.parse(d).records;
        if (records.length !== 1) {
          req.emit(  // is this really the right way?
            'error',
            `Expected to find a single Airtable record for participant ${participantId} ` +
              `but found ${records.length} instead`
          );
          return;
        }

        if (records[0][AT.PARENT_UUID]) {
          req.emit(
            'error',
            `Participant link used multiple times`
          );
          return;
        }

        writeNewUuid(records[0].id, newUuid);
      });
    });
    req.on('error', (e) => {
      console.error('Failed to locate Airtable record for parent uuid update:', e)
      fail(e);
    });
    req.end();
    success();
  });
}

module.exports = {
  updateParentUuid,
};
