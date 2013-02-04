// This just loads the shell on to the page. The fancy word for this
// is AMD ... but let's not be arrogant here.
//
// Here's some expected copy-pasta:
/*

document.body.innerHTML += '<script src="https://raw.github.com/kristopolous/js-shell/master/injecter.js"></script>';

*/

(function(){
  if(!self._Shell) {
    var script = document.body.createElement("script");
    script.src = "https://raw.github.com/kristopolous/js-shell/master/shell.js";
    document.body.appendChild(script.src);
  }

  var ival = setInterval(function() {
    if(self._Shell) {
      _Shell.init(document.body);
      clearInterval(ival);
    }
  }, 100);
});
