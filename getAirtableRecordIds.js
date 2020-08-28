const RECORDS_PER_PAGE = 100;
const { AT } = require('./constants');

const getAirtableRecordIds = (base) => {
  return new Promise((success, fail) => {
    let airtableRecordIds = {};
    base(AT.TABLE_NAME).select({
        pageSize: RECORDS_PER_PAGE,
        fields: [AT.ID_OF_PARTICIPANT],
        view: AT.VIEW_NAME,
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function(record) {
          let programId = record.fields[AT.ID_OF_PARTICIPANT];
          if (programId) {
            airtableRecordIds[programId] = record.id;
          }
        });
        fetchNextPage();
    }).then(()=>{
      success(airtableRecordIds);
    }).catch((err)=>{
      fail(err);
    })
  });
}

module.exports = {
  getAirtableRecordIds,
};
