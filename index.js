const express = require('express')
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
const _pipe_name = process.env.PIPE_NAME || 'Pipeline'
const PIPE_URL = '/' + _pipe_name;
const API_KEY = process.env.AIRTABLE_KEY || 'keykeykey';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app0app0app0';
const DOC_ID = process.env.DOC_ID || 'Table%201';

const KOBO_DEBUG = (process.env.KOBO_DEBUG || 'false').toLowerCase() !== 'false';

if (KOBO_DEBUG) {
  console.log("DEBUG MODE TRUE. heroku config: KOBO_DEBUG != 'false'")
}

const transformSubmission = (koboSubmission) => {
  const { id_participant } = koboSubmission;

  let data = {};
  // the template for each "record" passed to airtable
  let fieldsBase = {
    "Referred by": id_participant,
  };

  // if there's a field in the submission that endswith "/uuid" then note that
  // field as the value that will get passed to "submission_uuid"
  // this is so that we can validate which submissions were successfully passed
  // through to airtable (if we need to).
  const instanceIDfield = 'meta/instanceID';
  if (koboSubmission[instanceIDfield]) {
    fieldsBase['submission_uuid'] = koboSubmission[instanceIDfield]
      .replace('uuid:', '');
  }

  // fieldNames is an array like [['RECRUIT1_PHONE', 'RECRUIT1_NAME'], ...] for each value
  // found in the submission

  let fieldNames = ['1', '2', '3'].map(( num ) => {
    return [
      `recruitment/RECRUIT${num}_PHONE`,
      `recruitment/RECRUIT${num}_NAME`,
    ];
  });

  // compile the data.records to resemble
  // [
  //   {
  //     fields: {
  //       'Phone number': 'X1',
  //       'Name': 'Name',
  //       'submission_uuid': 'uuid_if_it_exists',
  //     }
  //   },
  //   ...
  // ]
  data.records = fieldNames.reduce(( arr,  [ phoneField, nameField ] ) => {
    if ( koboSubmission[ phoneField ] ) {
      arr.push({
        fields: Object.assign({}, fieldsBase, {
          'Phone number': koboSubmission[ phoneField ],
          'Name': koboSubmission[ nameField ] || '',
        })
      });
    }
    return arr;
  }, []);

  // generate information for the CURL or the AJAX POST
  let hostname = 'api.airtable.com';
  let path = `/v0/${AIRTABLE_BASE_ID}/${DOC_ID}`;
  let method = 'POST';
  let port = 443;
  let headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
  let url = `https://${hostname}${path}`;

  return {
    hostname,
    path,
    method,
    port,
    headers,
    data,
    uuid: fieldsBase['submission_uuid'],
    curl: `curl -v -X POST ${url} \\
      -H "Authorization: Bearer ${API_KEY}" \\
      -H "Content-Type: application/json" \\
      --data '${JSON.stringify(data)}'`
  };
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));


app.post(PIPE_URL, (req, res) => {
  if (KOBO_DEBUG) {
    console.log('RECEIVED: ' + JSON.stringify(req.body));
  }

  const {
    hostname,
    port,
    path,
    method,
    headers,
    uuid,
    data,
  } = transformSubmission(req.body);

  if (KOBO_DEBUG) {
    console.log('SENDING: ' + JSON.stringify(data));
  }

  const airtableReq = https.request({
    hostname,
    port,
    path,
    method,
    headers,
  }, (airtableRes) => {
    console.log(`forwarding submission: ${uuid} ${new Date()} status=${airtableRes.statusCode}`)
    const { statusCode } = airtableRes;
    airtableRes.on('data', (d) => {
      console.log('received by airtable');
      res.send(JSON.stringify({
        statusCode,
      }));
    });
  });

  airtableReq.on('error', (error) => {
    console.error(error);
  });

  airtableReq.write(JSON.stringify(data));
  airtableReq.end();
});

// TEST pages and ABOUT page

function templateFile(path, variables, callback) {
  fs.readFile(__dirname + '/' + path, (err, data) => {
    let respString = data.toString();
    Object.entries(variables).forEach( ([key, val]) => {
      respString = respString.replace(new RegExp('\\${' + key + '}', 'g'), val);
    })
    callback(respString);
  })
}



app.get(PIPE_URL, (req, res) => {
  templateFile('setup.html', {
    PIPE_URL,
  }, (html) => {
    res.send(html);
  });
})

// TESTER available at /Pipeline/test
// It's basically a way to send mock data to the "transformSubmission()" function
const TEST_URL = `${PIPE_URL}/test`;

app.post(TEST_URL, (req, res) => {
  return res.send(JSON.stringify(
    transformSubmission(req.body)
  ).replace(new RegExp(API_KEY, 'g'), 'API_KEY'));
});

app.get(TEST_URL, (req, res) => {
  templateFile('tester.html', {
    TEST_URL,
    PIPE_URL,
  }, (html) => {
    res.send(html);
  })
});

app.listen(port, () => console.log(`App listening at http://localhost:${port}`))
