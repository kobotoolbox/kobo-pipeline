const intervalMins = 1;
const intervalDesc = `${intervalMins} minute${intervalMins === 1 ? '' : 's'}`;

let tickerUpdate;

let baseStatus = '';

const msToWait = 1000 * 60 * intervalMins + 333;

function startInterval (statusEl, logEl, buttonEl, cb) {
  let nextTimeToRefer = (new Date()).getTime() + msToWait;
  let nextUpdate;

  function setUpdateInMotion () {
    statusEl.text(`Update in progress...`)
    cb().then(function({ message, finished }){
      // statusEl.text(`Update in progress...`)
      if (message != 'OK') {
        let li = $('<li>');
        let resp = JSON.stringify({ message, finished });
        $('<span>').text(new Date().toISOString() + ' : ').appendTo(li);
        $('<code>').text(resp).appendTo(li);
        li.prependTo(logEl);
      } else {
        baseStatus = '&check; ...';
      }
      window.setTimeout(startCountdown, 0);
    }).catch(function(err){
      statusEl.text(`Error: ${err}.`);
    });
  }

  buttonEl.click(function () {
    if (nextUpdate) {
      window.clearTimeout(nextUpdate);
      setUpdateInMotion();
    }
  });

  function startCountdown() {
    nextTimeToRefer = (new Date()).getTime() + msToWait;
    nextUpdate = window.setTimeout(setUpdateInMotion, msToWait);
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
  startCountdown();
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
  $('#interval-description', mainEl).text(intervalDesc);
  let logEl = $('#log');
  let statusEl = $('#status');
  let buttonEl = $('button', mainEl);;
  startInterval(statusEl, logEl, buttonEl, triggerRefresh);
});
