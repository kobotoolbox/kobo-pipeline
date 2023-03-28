const { atfield } = require('./constants');

// Airtable configs
const { table } = require('./airtableBase');

// add a n millisecond delay to each request to airtable
const DELAY = 0;
// airtable api request page size (100 is default)
const RECORDS_PER_PAGE = 100;

const callAirtableRefresher = async () => {
  const participants = await getParticipants();
  const updates = calculateUpdates(participants);
  if (updates.length > 0) {
    return saveReferralUpdatesToAT(participants, updates);
  } else {
    return {
      message: 'no referrals to update',
      finished: [],
    };
  }
}

const allResults = (params) => {
  let pages = [];
  return new Promise((success, reject) => {
    table.select(params).eachPage((records, fetchNextPage) => {
      pages = [...pages, ...records];
      setTimeout(() => {
        fetchNextPage();
      }, DELAY);
    }, (err) => {
      if (err) {
        reject(err);
      }
      success(pages);
    });
  })
}

const getParticipants = async () => {
  const results = await allResults({
    pageSize: RECORDS_PER_PAGE,
    fields: [atfield('ID_PARTICIPANT'),
              atfield('NAME'),
              atfield('RECRUITED_BY_ID'),
              atfield('PHONE'),
              atfield('REF_PHONE'),
              atfield('CARRIER'),
              atfield('REF_CARRIER'),
              atfield('RECRUITS_LIST')],
  });
  return results.map((rec) => new Participant(rec));
}

const main = async () => callAirtableRefresher();

const PARTICIPANTS_BY_SIMPLE_ID = {};

class Participant {
  constructor ({ _rawJson, fields, id }) {
    this.id = id;
    this.fields = fields;

    this.createdTime = new Date(_rawJson.createdTime);

    this._AT_NAME = fields[atfield('NAME')];
    this._AT_RECRUITED_BY_ID = fields[atfield('RECRUITED_BY_ID')];
    this._AT_RECRUITS = fields[atfield('RECRUITS_LIST')] || [];
    this._AT_ID_OF_PARTICIPANT = fields[atfield('ID_PARTICIPANT')];

    PARTICIPANTS_BY_SIMPLE_ID[this._AT_ID_OF_PARTICIPANT] = this;

    this._CALCULATED_REFERRALS = [];
    this._REFERRED_PARTICIPANTS = [];
    this._update = { id: this.id, fields: {} };
  }
  setReferrer () {
    this._REFERRER = PARTICIPANTS_BY_SIMPLE_ID[this._AT_RECRUITED_BY_ID];
    if (this._REFERRER === this) {
      throw new Error('Referrer is self')
    }
    if (this._REFERRER) {
      this._REFERRER._CALCULATED_REFERRALS.push(this.id);
      this._REFERRER._REFERRED_PARTICIPANTS.push(this);
    }
  }
  setCarrierIfNeeded () {
    if (this._REFERRER) {
      const updateIfChanged = (orig, dest) => {
        let val = this.fields[orig];
        if (val && this._REFERRER.fields[dest] !== val) {
          this._REFERRER._update.fields[dest] = val;
        }
      }

      // copy these fields:
      let ref_phone = atfield('REF_PHONE');
      let ref_carrier = atfield('REF_CARRIER');
      // to the REFERRER's airtable fields:
      let Phone = atfield('PHONE')
      let Carrier = atfield('CARRIER');

      updateIfChanged(ref_phone, Phone);
      updateIfChanged(ref_carrier, Carrier);
    }
  }
  changes () {
    const knownReferrals = this.stringifyList(this._AT_RECRUITS);
    const derivedReferrals = this.stringifyList(this._CALCULATED_REFERRALS);
    if (derivedReferrals !== knownReferrals) {
      this._update.fields[atfield('RECRUITS_LIST')] = this._CALCULATED_REFERRALS;
    }
    return {...this._update}
  }
  stringifyList (arr) {
    return JSON.stringify(arr.sort());
  }
}


const calculateUpdates = (_participants) => {
  let participants = _participants.sort((a, b)=>{
    if (a.createdTime == b.createdTime) { return 0 }
    return a.createdTime < b.createdTime ? -1 : 1
  });

  participants.forEach((p) => p.setReferrer());
  participants.forEach((p) => p.setCarrierIfNeeded());

  return participants.reduce((updates, participant) => {
    const changes = participant.changes();
    if (Object.keys(changes.fields).length === 0) {
      return updates;
    }
    return [...updates, changes];
  }, []);
}


const saveReferralUpdatesToAT = async (participants, updates) => {
  const records = await table.update(updates);

  let byId = {};
  participants.forEach((p) => byId[p.id] = p );
  let messages = [];
  let finished = [];

  records.forEach((record) => {
    let { fields } = record;
    let referredList = fields[atfield('RECRUITS_LIST')] || [];
    let ids = referredList.map(
      (pId) => (
        byId[pId] ? `${byId[pId]._AT_ID_OF_PARTICIPANT}` : '?'
      )
    );
    let destId = fields[atfield('ID_PARTICIPANT')];
    finished.push([destId, ids]);
    messages.push(
      `UPDATED ${destId}: [${ids.join(', ')}]`
    )
  });
  return {
    finished,
    message: messages.join('\n'),
  };
}

module.exports = {
  callAirtableRefresher,
  main,
};
