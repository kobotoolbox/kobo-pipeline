let ExampleColumnMappingJson = `
{
  "ID_OF_PARTICIPANT": "ID de participant",
  "NAME": "Prénom",
  "RECRUITED_BY_ID": "Recruté par",
  "PHONE_NUMBER_COL": "Numéro de téléphone",
  "RECRUITS_COL": "Recrues",
  "CARRIER": "Airtable COL CARRIER",
  "INCENTIVE": "Airtable COL TEL INCENTIVO",
  "REFS_CARRIER": "Airtable COL REFS CARRIER",
  "REFS_INCENTIVE": "Airtable COL REFS INCENTIVE",
  "SPECIFIED_CARRIER": "SPECIFIED_CARRIER",
  "PHONE_FOR_INCENTIVE": "PHONE_FOR_INCENTIVE",
  "TIMESTAMP": "Date invitation",
  "UUID": "submission_uuid",
  "PARENT_UUID": "Airtable COL submission_uuid"
}
`;

let AT = JSON.parse(
  process.env.COL_MAPPING ? process.env.COL_MAPPING : ExampleColumnMappingJson
);

// assert expected keys are found
[
  'ID_OF_PARTICIPANT',
  'NAME',
  'RECRUITED_BY_ID',
  'PHONE_NUMBER_COL',
  'RECRUITS_COL',
  'CARRIER',
  'INCENTIVE',
  'REFS_CARRIER',
  'REFS_INCENTIVE',
  'SPECIFIED_CARRIER',
  'PHONE_FOR_INCENTIVE',
  'TIMESTAMP',
  'UUID',
  'PARENT_UUID',
].forEach((key) => {
  if (!AT[key]) {
    throw new Error(`Missing Config: ${key}`)
  }
});

Object.assign(AT, {
  VIEW_NAME: process.env.AT_VIEW_NAME || 'All data',
  TABLE_NAME: process.env.AT_TABLE_NAME || 'Respondent tracker',
});

module.exports = {
  // field names pulled from the kobo submission
  KOBODATA: {
    ID_PARTICIPANT: 'id_participant',
    TODAY: 'today',
    CARRIER: 'CLOSING/CARRIER',
    // INCENTIVE should just be called PHONE_INCENTIVE
    INCENTIVE: 'CLOSING/PHONE_INCENTIVE',
    PHONE_INCENTIVE: 'CLOSING/PHONE_INCENTIVE',
    NAME_PATH: (n) => `RECRUITMENT/RECRUIT${n}_NAME`,
    PHONE_PATH: (n) => `RECRUITMENT/RECRUIT${n}_PHONE`,
    UUID_PATH: 'meta/instanceID',
  },
  // Fields used in the column headers of the AirTable (AT) document
  AT,
}
