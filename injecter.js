// This just loads the shell on to the page.
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
