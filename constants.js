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

const requireEnvironmentVariable = (varname, note) => {
  const val = process.env[varname];
  if (!val) {
    throw new Error(`Missing environment variable: ${varname} ${note}`)
  }
  return val;
}

const KOBODATA = [
  ['KOBODATA_INDEXED_NAME', `e.g. RECRUITMENT/RECRUIT#_NAME`],
  ['KOBODATA_INDEXED_PHONE', `e.g. RECRUITMENT/RECRUIT#_PHONE`],
  ['KOBODATA_ID_PARTICIPANT', `e.g. id_participant`],
  ['KOBODATA_TODAY', `e.g. today`],
  ['KOBODATA_CARRIER', `e.g. RECRUITMENT/CARRIER`],
  ['KOBODATA_PHONE_INCENTIVE', `e.g. RECRUITMENT/PHONE_INCENTIVE`],
].reduce((obj, [vname, note]) => {
  const val = process.env[vname];
  if (!val) {
    throw new Error(`Missing process.env: ${vname}\n${note}`);
  }
  let shortname = vname.replace('KOBODATA_', '');
  return {
    ...obj,
    [shortname]: val,
  }
}, {});

['INDEXED_NAME', 'INDEXED_PHONE'].forEach((vname)=> {
  if (!KOBODATA[vname].match(/#/)) {
    throw new Error(`process.env.KOBODATA_${vname} must have a "#" in its value`);
  }
})


module.exports = {
  // field names pulled from the kobo submission
  KOBODATA,
  // Fields used in the column headers of the AirTable (AT) document
  atfield: (vname) => {
    if (!AT_FIELDS[vname]) {
      throw new Error('missing field: ' + vname);
    }
    return AT_FIELDS[vname];
  },
}
