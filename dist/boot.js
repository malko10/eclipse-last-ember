(function () {
  function report(message) {
    var panel=document.getElementById('fatal-error'),detail=document.getElementById('fatal-message');
    if(panel&&detail){detail.textContent='실행 중 문제가 생겼습니다. '+String(message||'브라우저에서 실행을 완료하지 못했습니다.');panel.classList.remove('hidden');}
  }
  window.addEventListener('error',function(e){if(e.message)report(e.message);});
  window.addEventListener('unhandledrejection',function(e){report(e.reason&&e.reason.message||e.reason);});
  window.eclipseReportError=report;
})();
