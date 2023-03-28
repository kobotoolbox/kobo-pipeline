const express = require('express')
const app = express();
app.use(require('body-parser').json());

const { callAirtableRefresher } = require('./updateReferrals');
const { table } = require('./airtableBase');

const { readFile } = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(readFile);

const port = process.env.PORT || 3000;
const PIPE_NAME = process.env.PIPE_NAME || 'Pipeline'


// const assertEqual = (thing1, thing2) => { if (thing1 !== thing2) { throw new Error(`NOT EQUAL: ${thing1} !== ${thing2}`) } };

// URLS
const PIPE_URL = `/${PIPE_NAME}`;
const TEST_URL = `/${PIPE_NAME}/test`;
const AIRTABLE_REFRESH_URL = `/${PIPE_NAME}/airtable`;

const { atfield, KOBODATA } = require('./constants');
const AUTO_REFRESH_AIRTABLE = !['0', 'false'].includes(`${process.env.AUTO_REFRESH_AIRTABLE}`.toLowerCase());
const KOBO_DEBUG = (process.env.KOBO_DEBUG || 'false').toLowerCase() !== 'false';

if (KOBO_DEBUG) {
  console.log("DEBUG MODE TRUE. heroku config: KOBO_DEBUG != 'false'")
}

// assertEqual(AT.PHONE_NUMBER_COL, AT.fields.PHONE);
// assertEqual(AT.NAME, AT.fields.NAME);
// assertEqual(AT.fields.TODAY, 'TIMESTAMP');

const xsub = (koboSubmission) => {
  ['CARRIER', 'PHONE_INCENTIVE'].forEach((vv)=>{
    if (koboSubmission[`CLOSING/${vv}`]) {
      koboSubmission[`RECRUITMENT/${vv}`] = koboSubmission[`CLOSING/${vv}`]
    }
  });

  let timestampField = atfield('TODAY') || 'attoday';
  let postData = {
    [atfield('RECRUITED_BY_ID')]: koboSubmission[KOBODATA.ID_PARTICIPANT],
    [atfield('REF_CARRIER')]: koboSubmission[KOBODATA.CARRIER] || '',
    [atfield('REF_PHONE')]: koboSubmission[KOBODATA.PHONE_INCENTIVE] || '',
    [timestampField]: koboSubmission[KOBODATA.TODAY] || new Date().toISOString(),
  };
  let records = [];
  for (let i=1; i<=3; i++) {
    let phoneVar = `RECRUITMENT/RECRUIT${i}_PHONE`; // RECRUITMENT/RECRUIT1_PHONE
    let nameVar = `RECRUITMENT/RECRUIT${i}_NAME`;  // RECRUITMENT/RECRUIT1_NAME
    
    if (koboSubmission[phoneVar]) {
      records.push({
        ...postData,
        [atfield('PHONE')]: koboSubmission[phoneVar],
        [atfield('NAME')]: koboSubmission[nameVar],
      });
    }
  }
  return records;
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));


app.post(PIPE_URL, async (req, res) => {
  if (KOBO_DEBUG) {
    console.log('RECEIVED: ' + JSON.stringify(req.body));
  }
  const records = xsub(req.body).map((rec) => { return { fields: rec } });
  let created;
  if (records.length > 0) {
    created = table.create(records);
  }
  if (AUTO_REFRESH_AIRTABLE) {
    const results = await callAirtableRefresher();
    res.send(results);
  } else {
    const n = records.length
    res.send({
      message: `sent ${n} records`,
      finished: [],
    });
  }
});

// TEST pages and ABOUT page
const templateFile = async (path, variables) => {
  const txt = await readFileAsync(__dirname + '/' + path);
  let respString = txt.toString();
  Object.entries(variables).forEach( ([key, val]) => {
    respString = respString.replace(new RegExp('\\${' + key + '}', 'g'), val);
  });
  return respString;
}

app.get(PIPE_URL, async (req, res) => {
  const html = await templateFile('setup.html', { PIPE_URL });
  res.send(html);
});

app.get(AIRTABLE_REFRESH_URL, async (req, res) => {
  const AIRTABLE_REFRESHER_SCRIPT = (await readFileAsync(__dirname + '/airtableRefresher-page.js')).toString();
  const html = await templateFile('airtableRefresher.html', {
    AIRTABLE_REFRESHER_SCRIPT,
  });
  res.send(html);
});

app.post(AIRTABLE_REFRESH_URL, async (req, res) => {
  const { message, finished } = await callAirtableRefresher();
  res.send(JSON.stringify({
    message,
    finished,
  }));
});

// TESTER available at /Pipeline/test
// It's basically a way to send mock data to the "transformSubmission()" function
app.post(TEST_URL, async (req, res) => {
  return res.send(JSON.stringify(xsub(req.body)));
});

app.get(TEST_URL, async (req, res) => {
  const html = await templateFile('tester.html', { TEST_URL, PIPE_URL });
  res.send(html);
});

app.listen(port, () => console.log(`App listening at http://localhost:${port}`))
