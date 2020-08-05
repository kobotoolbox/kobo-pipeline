module.exports = {
  // field names pulled from the kobo submission
  KOBODATA: {
    ID_PARTICIPANT: 'id_participant',
    TODAY: 'today',
    CARRIER: 'CLOSING/CARRIER',
    INCENTIVE: 'CLOSING/PHONE_INCENTIVE',
    NAME_PATH: (n) => `RECRUITMENT/RECRUIT${n}_NAME`,
    PHONE_PATH: (n) => `RECRUITMENT/RECRUIT${n}_PHONE`,
    UUID_PATH: 'meta/instanceID',
  },
  // Fields used in the column headers of the AirTable (AT) document
  AT: {
    TABLE_NAME: 'Respondent tracker',
    CARRIER: 'Operador de telefonía',
    ID_OF_PARTICIPANT: 'ID del participante',
    INCENTIVE: 'Teléfono para incentivo',
    NAME: 'Nombre',
    RECRUITED_BY_ID: 'Reclutado por',
    PHONE_NUMBER_COL: 'Número de teléfono',
    RECRUITS_COL: 'Reclutas',
    REFS_CARRIER: 'Airtable COL REFS CARRIER',
    REFS_INCENTIVE: 'Airtable COL REFS INCENTIVE',
    TIMESTAMP: 'Fecha envio invitacion',
    UUID: 'submission_uuid',
  },
}
