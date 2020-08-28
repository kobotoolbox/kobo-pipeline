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
  AT: {
    VIEW_NAME: process.env.AT_VIEW_NAME || 'All data',
    TABLE_NAME: process.env.AT_TABLE_NAME || 'Respondent tracker',
    ID_OF_PARTICIPANT: 'ID del participante',
    NAME: 'Nombre',
    RECRUITED_BY_ID: 'Reclutado por',
    PHONE_NUMBER_COL: 'Número de teléfono',
    RECRUITS_COL: 'Reclutas',
    CARRIER: 'Airtable COL CARRIER',
    INCENTIVE: 'Airtable COL TEL INCENTIVO',
    REFS_CARRIER: 'Airtable COL REFS CARRIER',
    REFS_INCENTIVE: 'Airtable COL REFS INCENTIVE',
    SPECIFIED_CARRIER: 'SPECIFIED_CARRIER',
    PHONE_FOR_INCENTIVE: 'PHONE_FOR_INCENTIVE',
    TIMESTAMP: 'Fecha envio invitacion',
    UUID: 'submission_uuid',
  },
}
