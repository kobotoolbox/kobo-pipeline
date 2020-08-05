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
const { AT } = require('./constants');

function logError (arg) {
  console.error(arg);
}


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
            sendUpdatesToAirtable(participants, updates)
              .then(success)
              .catch(fail);
          }, DELAY);
        }
      }).catch(fail);
    }).catch(fail);
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
    }).catch(logError);
  }).catch(logError);
}


const PARTICIPANTS_BY_SIMPLE_ID = {};

class Participant {
  constructor ({ _rawJson, fields, id }) {
    this.id = id;
    this.fields = fields;

    this.createdTime = new Date(_rawJson.createdTime);

    this._AT_NAME = fields[AT.NAME];
    this._AT_RECRUITED_BY_ID = fields[AT.RECRUITED_BY_ID];
    this._AT_RECRUITS = fields[AT.RECRUITS_COL] || [];
    this._AT_ID_OF_PARTICIPANT = fields[AT.ID_OF_PARTICIPANT];

    PARTICIPANTS_BY_SIMPLE_ID[this._AT_ID_OF_PARTICIPANT] = this;

    this._CALCULATED_REFERRALS = [];
    this._REFERRED_PARTICIPANTS = [];
    this._update = { id: this.id, fields: {} };
  }
  setReferrer () {
    this._REFERRER = PARTICIPANTS_BY_SIMPLE_ID[this._AT_RECRUITED_BY_ID];
    if (this._REFERRER) {
      this._REFERRER._CALCULATED_REFERRALS.push(this.id);
      this._REFERRER._REFERRED_PARTICIPANTS.push(this);
    }
  }
  setCarrierIfNeeded () {
    if (this._REFERRER) {
      [
        [AT.CARRIER, AT.REFS_CARRIER],
        [AT.INCENTIVE, AT.REFS_INCENTIVE],
      ].forEach(([destCol, origCol]) => {
        let val = this.fields[origCol];
        if (val && this._REFERRER.fields[destCol] !== val) {
          this._REFERRER._update.fields[destCol] = val;
        }
      });
    }
  }
  decideIfUpdatesNeeded () {
    const knownReferrals = this.stringifyList(this._AT_RECRUITS);
    const derivedReferrals = this.stringifyList(this._CALCULATED_REFERRALS);
    if (derivedReferrals !== knownReferrals) {
      this._update.fields[AT.RECRUITS_COL] = this._CALCULATED_REFERRALS;
    }
    this.needsUpdates = Object.keys(this._update.fields).length > 0;
  }
  stringifyList (arr) {
    return JSON.stringify(arr.sort());
  }
}


const getParticipants = () => {
  if (SHOW_STATUS) {
    process.stdout.write('.');
  }
  return new Promise((success, fail) => {
    let _parts = [];
    base(AT.TABLE_NAME).select({
        pageSize: RECORDS_PER_PAGE,
        fields: [AT.ID_OF_PARTICIPANT,
                 AT.NAME,
                 AT.RECRUITED_BY_ID,
                 AT.CARRIER,
                 AT.INCENTIVE,
                 AT.REFS_CARRIER,
                 AT.REFS_INCENTIVE,
                 AT.RECRUITS_COL],
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

    participants.forEach((p) => p.setReferrer());
    participants.forEach((p) => p.setCarrierIfNeeded());
    participants.forEach((p) => p.decideIfUpdatesNeeded());

    let updateParams = [];
    participants.forEach((participant) => {
      if (participant.needsUpdates) {
        updateParams.push(participant._update);
      }
    });
    success(updateParams);
  });
}


const sendUpdatesToAirtable = (participants, updates) => {
  return new Promise((success, fail) => {
    base(AT.TABLE_NAME).update(updates, function (err, records) {
      if (err) { console.error(err); return fail(err); }

      let byId = {};
      participants.forEach((p) => byId[p.id] = p );

      let messages = [];
      let finished = [];
      records.forEach((record) => {
        let { fields } = record;
        let referredList = fields[AT.RECRUITS_COL] || [];
        let ids = referredList.map(
          (pId) => (
            byId[pId] ? `${byId[pId]._AT_ID_OF_PARTICIPANT}` : '?'
          )
        );
        let destId = fields[AT.ID_OF_PARTICIPANT];
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
  callAirtableRefresher,
};
