
const intervalMins = 0.5;
const intervalDesc = `${intervalMins} minute${intervalMins === 1 ? '' : 's'}`;

let tickerUpdate;

let baseStatus = '';

const msToWait = 1000 * 60 * intervalMins + 333;

function startInterval (statusEl, logEl, cb) {
  function next() {
    let nextTimeToRefer = (new Date()).getTime() + msToWait;
    window.setTimeout(function () {
      statusEl.text(`Update in progress...`)
      cb().then(function({ message, finished }){
        // statusEl.text(`Update in progress...`)
        if (message != 'OK') {
          let li = $('<li>');
          $('<span>').text(new Date().toISOString() + ' : ').appendTo(li);
          $('<code>').text(resp).appendTo(li);
          li.prependTo(logEl);
        } else {
          baseStatus = '&check; ...';
        }
        window.setTimeout(next, 1000);
      }).catch(function(err){
        statusEl.text(`Error: ${err}.`);
      });
    }, msToWait);
    if (tickerUpdate) {
      window.clearInterval(tickerUpdate);
    }
    tickerUpdate = window.setInterval(function () {
      let curMs = (new Date()).getTime();
      let msToGo = (nextTimeToRefer - curMs);
      if (msToGo > 500) {
        let secondsToGo = Math.round(msToGo / 1000);
        statusEl.html(`${baseStatus}Next update in ${secondsToGo} seconds`)
      }
    }, 1000);
  }
  next();
}

jQuery(function ($) {
  function triggerRefresh () {
    return new Promise(function (success, fail) {
      $.post(loc).then(function(resp, status, req){
        success(JSON.parse(resp))
      }).catch(function(req, status, err){
        fail(err)
      });
    })
  }
  const loc = window.location.href;
  const mainEl = $('#main');
  mainEl.html(`
    Refreshing airtable references every ${intervalDesc}.
    <br>
    <p id='next'></p>
    <p id='status'></p>
    <button>Refresh now</button>
    <ul id='log'>
    </ul>
    <br>
  `);
  let logEl = $('#log');
  let statusEl = $('#status');
  $('button', mainEl).click(triggerRefresh);
  startInterval(statusEl, logEl, triggerRefresh);
});
