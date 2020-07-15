const express = require('express')
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const { callAirtableRefresher } = require('./updateReferrals');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
const _pipe_name = process.env.PIPE_NAME || 'Pipeline'
const PIPE_URL = '/' + _pipe_name;
const TEST_URL = `${PIPE_URL}/test`;
const AIRTABLE_REFRESH_URL = `${PIPE_URL}/airtable`;
const API_KEY = process.env.AIRTABLE_KEY || 'keykeykey';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app0app0app0';
const DOC_ID = process.env.DOC_ID || 'Table%201';

const AUTO_REFRESH_AIRTABLE = !!process.env.AUTO_REFRESH_AIRTABLE;

const KOBO_DEBUG = (process.env.KOBO_DEBUG || 'false').toLowerCase() !== 'false';

if (KOBO_DEBUG) {
  console.log("DEBUG MODE TRUE. heroku config: KOBO_DEBUG != 'false'")
}

const transformSubmission = (koboSubmission) => {
  const { id_participant } = koboSubmission;

  let data = {};
  // the template for each "record" passed to airtable
  let fieldsBase = {
    "Reclutado por": id_participant,
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
      `RECRUITMENT/RECRUIT${num}_PHONE`,
      `RECRUITMENT/RECRUIT${num}_NAME`,
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
          'Número de teléfono': koboSubmission[ phoneField ],
          'Nombre': koboSubmission[ nameField ] || '',
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


function parseResponse (responseString) {
  const { records } = JSON.parse(responseString);
  const referrals = [];
  let referred_by;
  records.forEach(function({ fields }) {
    referred_by = fields['Reclutado por'];
    referrals.push(fields['ID del participante']);
  });
  return {
    post_response_actions: [
      ['query', {'ID del participante': referred_by, 'field': 'Reclutas'}],
      ['append_ids_to_list', referrals],
      ["update_record", {
        'Participant ID': referred_by,
        'field': 'Reclutas',
        'value': ['existing_referrals_plus', referrals],
      }],
    ]
  };
}


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
    console.log(`TO: ${hostname}:${port}${path}#KEY ${headers.Authorization}`);
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
    airtableRes.setEncoding('utf8');
    airtableRes.on('data', (d) => {
      console.log(JSON.stringify(parseResponse(d)));
      console.log('received by airtable');
      if (AUTO_REFRESH_AIRTABLE) {
          console.log('Now updating referrals');
          callAirtableRefresher().then(({ message, finished }) => {
            console.log('Finished updating referrals');
            console.log(message);
            console.log(finished);
            res.send(JSON.stringify({
              statusCode,
            }));
          });
      } else {
        res.send(JSON.stringify({
          statusCode,
        }));
      }
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
});

// TESTER available at /Pipeline/test
// It's basically a way to send mock data to the "transformSubmission()" function

app.get(AIRTABLE_REFRESH_URL, (req, res) => {
  fs.readFile(__dirname + '/airtableRefresher-page.js', (err, data) => {
    let AIRTABLE_REFRESHER_SCRIPT = data.toString();
    templateFile('airtableRefresher.html', {
      AIRTABLE_REFRESHER_SCRIPT,
    }, (html) => {
      res.send(html);
    });
  });
});
app.post(AIRTABLE_REFRESH_URL, (req, res) => {
  callAirtableRefresher().then(({ message, finished }) => {
    res.send(JSON.stringify({
      message,
      finished,
    }));
  });
});

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
