const AT_FIELDS = {};

const pullAtFieldFromEnv = (fieldId) => {
  const envVar = `AIRTABLE_FIELDS_${fieldId}`;
  const val = process.env[envVar];
  if (!val) {
    throw new Error(`Variable not defined: ${envVar}`)
  }
  AT_FIELDS[fieldId] = val;
}

[
  'ID_PARTICIPANT',
  'RECRUITS_LIST',
  'NAME',
  'TODAY',
  'RECRUITED_BY_ID',
  'PHONE',
  'CARRIER',
  'REF_PHONE',
  'REF_CARRIER',
].forEach((f) => pullAtFieldFromEnv(f));

module.exports = {
  // field names pulled from the kobo submission
  KOBODATA: {
    ID_PARTICIPANT: 'id_participant',
    TODAY: 'today',
    CARRIER: 'RECRUITMENT/CARRIER',
    PHONE_INCENTIVE: 'RECRUITMENT/PHONE_INCENTIVE',
  },
  // Fields used in the column headers of the AirTable (AT) document
  atfield: (vname) => {
    if (!AT_FIELDS[vname]) {
      throw new Error('missing field: ' + vname);
    }
    return AT_FIELDS[vname];
  },
}
