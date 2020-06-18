const Airtable = require('airtable');

// Airtable configs
const AIRTABLE_KEY = process.env.AIRTABLE_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

if (!AIRTABLE_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_KEY and AIRTABLE_BASE_ID ' +
                  'variables not set.')
}

const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE_ID);


// add a n millisecond delay to each request to airtable
const DELAY = 0;

// show `.` when a request to airtable is run
const SHOW_STATUS = process.env.SHOW_STATUS || false;
// airtable api request page size (100 is default)
const RECORDS_PER_PAGE = 100;

// fields with spaces
const PARTICIPANTS_REFERRED = 'Participants referred';
const REFERRED_BY = 'Referred by';
const PARTICIPANT_ID = 'Participant ID';

function callAirtableRefresher () {
  return new Promise((success, fail)=>{
    getParticipants().then((participants) => {
      calculateUpdates(participants).then((updates) => {
        if (updates.length === 0) {
          success({
            message: 'OK',
            finished: [],
          })
        } else {
          setTimeout(() => {
            sendUpdatesToAirtable(participants, updates).then(success);
          }, DELAY);
        }
      });
    });
  })
}

function main () {
  process.stdout.write(`Running script to update ` +
                       `AirTable with records of referrals`)
  if (DELAY > 0) {
    process.stdout.write(`Scripts throttled to no more than ` +
                         ` once every ${DELAY/1000} seconds`);
  }

  getParticipants().then((participants) => {
    calculateUpdates(participants).then((updates) => {
      if (updates.length === 0) {
        console.log('\nNothing to update');
      } else {
        console.log(`\n${updates.length} records to update...`);
        // console.log('Updates:', updates);

        if (SHOW_STATUS) {
          process.stdout.write('.');
        }
        setTimeout(() => {
          if (SHOW_STATUS) {
            process.stdout.write('.\n');
          }

          sendUpdatesToAirtable(participants, updates).then(({
            message,
            finished,
          }) => {
            console.log(message);
            // console.log(JSON.stringify(finished))
          });
        }, DELAY);
      }
    });
  });
}



class Participant {
  constructor ({ _rawJson, fields, id }) {
    this.id = id;
    this.createdTime = new Date(_rawJson.createdTime);
    this.simpleId = fields[PARTICIPANT_ID];
    this.referredBy = fields[REFERRED_BY];
    this.participantsReferred = fields[PARTICIPANTS_REFERRED] || [];

    this._update = false;
  }
  stringifyList (arr) {
    return JSON.stringify(arr.sort());
  }
  updateParticipantsReferred (values) {
    let existing = this.stringifyList(this.participantsReferred);
    let desired = this.stringifyList([...values]);
    if (desired !== existing) {
      this._update = {
        id: this.id,
        fields: {
          [PARTICIPANTS_REFERRED]: values,
        }
      };
    }
  }
}


const getParticipants = () => {
  if (SHOW_STATUS) {
    process.stdout.write('.');
  }
  return new Promise((success, fail) => {
    let _parts = [];
    base('Respondent tracker').select({
        pageSize: RECORDS_PER_PAGE,
        fields: [PARTICIPANT_ID, REFERRED_BY, PARTICIPANTS_REFERRED],
        view: "All data"
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function(record) {
          _parts.push(new Participant(record));
        });
        if (SHOW_STATUS) {
          process.stdout.write('.');
        }
        setTimeout(() => {
          if (SHOW_STATUS) {
            process.stdout.write('.');
          }
          fetchNextPage();
        }, DELAY);
    }, function done(err) {
        if (err) {
          fail(err);
        } else {
          success(_parts);
        }
    });
  });
}


const calculateUpdates = (_participants) => {
  return new Promise((success, fail) => {
    // sort by createdTime
    let participants = _participants.sort((a, b)=>{
      if (a.createdTime == b.createdTime) { return 0 }
      return a.createdTime < b.createdTime ? -1 : 1
    });

    // create an object with empty lists
    let referrals = participants.reduce((referrals, participant) => {
      referrals[participant.simpleId] = [];
      return referrals;
    }, {});

    // populate lists with people they referred
    participants.forEach((participant) => {
      let { referredBy } = participant;
      if (referrals[referredBy]) {
        referrals[referredBy].push(participant.id);
      } // else: participant not found, e.g. "0"
    });

    // compare populated list with values already in airtable
    participants.forEach((participant) => {
      participant.updateParticipantsReferred(referrals[participant.simpleId]);
    });

    // gather values that need to be updated (non-false)
    let updateParams = participants.map(
      (participant) => participant._update
    ).filter(
      (value) => value !== false
    );

    success(updateParams);
  });
}


const sendUpdatesToAirtable = (participants, updates) => {
  return new Promise((success, fail) => {
    base('Respondent tracker').update(updates, function (err, records) {
      if (err) { console.error(err); return fail(err); }

      let byId = {};
      participants.forEach((p) => byId[p.id] = p );

      let messages = [];
      let finished = [];
      records.forEach((record) => {
        let { fields } = record;
        let referredList = fields[PARTICIPANTS_REFERRED] || [];
        let ids = referredList.map(
          (pId) => (
            byId[pId] ? `${byId[pId].simpleId}` : '?'
          )
        );
        let destId = fields[PARTICIPANT_ID];
        finished.push([destId, ids]);
        messages.push(
          `UPDATED ${destId}: [${ids.join(', ')}]`
        )
      });

      let message = messages.join('\n');

      success({
        finished,
        message,
      });
    });
  });
}

module.exports = {
  callAirtableRefresher: callAirtableRefresher
};
