self.Gdb = (function(){
    	function getTime(){
		return ((Date.now() - epoch) / 1000).toFixed(3);
	}
	var 	func,
		container,
		buffer = [],
		input,
		// cache of elements
		elCache = {ctr:0},
		history = {
			data: [],
			ptr: 0
		},
    		tabList = {},
		data,
		active = false,
		noTime = false,
		epoch,
		epochSupport = true,
		outCount = 0;

	try {
		epoch = Date.now();
	} catch (ex) {
		epochSupport = false;
		epoch = 0;
	}

	pub = function() {
		var 	argsList = Array.prototype.slice.call(arguments),
			args = argsList.toString(),
			output = "",
			ix;

		if(typeof(argsList[0]) == 'object') {
			for(ix = 0; ix < argsList.length; ix++) {
				if(typeof(argsList[ix]) == 'object') {
					// we dump the object in an object cache
					// so we can still have things that are encapsulated
					// but we can analyze them in the debugger.
					elCache.ctr ++;
					elCache[elCache.ctr] = argsList[ix];

					// we do a reference breadcrumb to the screen
					Gdb.raw('<a onclick=Gdb.extend("",this)>Gdb.cache[' + elCache.ctr + ']</a>');

					Gdb.walk(argsList[ix]);
				} else {
					data.append('<br>' + argsList[ix]);
				}
			}
		} else {
			if(!noTime && epochSupport) {
				output += getTime();
				output += "[" + args.toString() + "]";
			} else {
				output += args.toString();
			}

			if(data) {
				data.innerHTML += "<br>" + output;
			} else {
				buffer.push("<br>" + output);
			}
		}

		outCount++;

		if(outCount % 500 == 0) {
			var par = data.parentNode;
			data = par.removeChild(data);
			var last = data.childNodes.length / 2;

			for(ix = 0; ix < last; ix++) {
				data.removeChild(data.firstChild);
			}

			data = par.insertBefore(data, par.lastChild);
		}
		if(pub.scroll) {
			Gdb.data.scrollTop = Gdb.data.scrollHeight;
		}

	}
	
	pub.scroll = true;
	// After declaration, we create a backreference
	// to the cache to expose it
	pub.cache = elCache;
	pub.history = history;

	pub.init = function() {
		if(container) {
			return;
		}

		history.data = [];
		history.ptr = history.data.length;

		pub.win = window.open('', 'debugger', 'width=500,height=400');

		setTimeout(function(){
			var dbg = pub.win.content.document.getElementById('dbg');

			if(dbg) {
				pub.container = container = dbg;
				pub.input = input = pub.win.content.document.getElementsByTagName('input')[0];
				data = dbg.firstChild;
			} else {
				pub.container = container = document.createElement('div');
				container.setAttribute('id', 'dbg');
				container.id = 'dbg';

				pub.input = input = document.createElement('input');
				input.setAttribute('class', 'in');
				input.className = 'in';

				data = document.createElement('div');
				data.setAttribute('class', 'data');
				data.className = 'data';
				
				var ss = document.createElement('link');
				ss.setAttribute('rel', 'stylesheet');
				ss.setAttribute('href', 'http://qaa.ath.cx/utils.css');


				pub.win.content.document.body.parentNode.firstChild.appendChild(ss);

				container.appendChild(data);
				container.appendChild(input);

				pub.win.content.document.body.appendChild(container);

				with(pub.win.content.document.body.parentNode.style) {
					width = 'auto';
					height = 'auto';
					margin = '0';
				}
				
				with(pub.win.content.document.body.style) {
					width = 'auto';
					height = 'auto';
					marginBottom = '20px';
				}
			}

			data.addEventListener('mouseup', function(){
				pub.input.focus();
			}, true);

			data.innerHTML += buffer.join('');
			buffer = [];
			pub.data = data;

			pub.win.content.Gdb = Gdb;
			Gdb('init');

			input.addEventListener('keydown', function(e) {
				var kc;

				if (window.event) kc = window.event.keyCode;
				else if (e) kc = e.which;

				if(kc == 38) {
					if(history.ptr > 0) {
						history.ptr --;
						input.value = history.data[history.ptr];
					} else {
						top.Gdb && top.Gdb.flash();
					}
				} else if(kc == 40) {
					if(history.ptr < (history.data.length - 1)) {
						history.ptr ++;
						input.value = history.data[history.ptr];
					} else {
						history.ptr = history.data.length;
						input.value = "";
					}
				} else if(kc == 9) {
					e.preventDefault();
					e.stopPropagation();
					Gdb.tabComplete();
				} else if(kc == 13) {
					Gdb.enter(this);
				}
			}, true);
		}, 50);
	}

	pub.pre = function(){
		var old = noTime;
		noTime = true;

		pub([
			'<pre>', 
			Array.prototype.slice.call(arguments)
				.toString()
				.replace(/</g, '&lt;') 
				.replace(/>/g, '&gt;'),
			'</pre>'].join(''));

		noTime = old;
	}

	pub.tabCreate = function(name) {
	}

	pub.reset = function(name){
        	if(name in counters) {
            		counters[name] = 0;
	    		Gdb(name + ': (reset)');
	  	}
	}

        var counters = {};
        pub.incr = function(name){
        	if(name in counters) {
            		counters[name]++;
          	} else {
            		counters[name] = 1;
          	}
 	        Gdb('<a onclick=Gdb.reset("' + name + '")>' + name + '</a>: ' + counters[name]);
        }


        pub.decr = function(name) {
        	if(name in counters) {
            		counters[name]--;
          	} else {
            		counters[name] = 0;
          	}
 	        Gdb('<a onclick=Gdb.reset("' + name + '")>' + name + '</a>: ' + counters[name]);
        }

	pub.raw = function(){
		var old = noTime;
		noTime = true;
		pub(Array.prototype.slice.call(arguments).toString());
		noTime = old;
	}

	pub.watch = function(f, fName, args) {
		Gdb.raw(f, fName, args.toSource());
		Gdb.stack(2);
		Gdb.wList[f][0].apply(this, args);
		Gdb.data.scrollTop = Gdb.data.scrollHeight;
	}

	pub.stack = function(count) {
		var stack;

		try {
			throw new Error();
		} catch(e) {
			stack = e.stack.split('\n');
			stack.shift();
			stack.shift();
			if(count) {
				while(count-- > 0) {
					stack.shift();
				}
			}
			Gdb.pre(stack.join('\n').replace(/\([^\)]*./g, ''));
		}
	}

	if(self.Jquery) {
		$(document).keydown(function(e){
			if(e.which == 113) {
				pub.init();
			}
		});
	} else {
		pub.init();
	}

	return pub;
})();



Gdb.wList = {};
Gdb.wCtr = 0;
Gdb.cmd = {
	clear: function(){
		Gdb.data.html("");
	},

	'!': function(tmp) {
		tmp.shift();
		Gdb.raw(eval(tmp.join(' ')).toSource());
	},

	unw: function(tmp) {
		var 	wp = tmp[1],
			fBody = wList[wp][0];
			fName = wList[wp][1];

		eval(fName + ' = ' + fBody);
		Gdb.raw('watchpoint ' + wp + ' on ' + fName + ' removed.');

		delete wList[wp];
	},

	w: function(tmp) {
		if(tmp.length == 1) {
			var flag = false;
			for(ix in wList) {
				Gdb.raw('[' + ix + '] ' + wList[ix][1]);
				flag = true;
			}

			if(!flag) {
				Gdb.raw('No watchpoints set');
			}

			return;
		}

		Gdb.wCtr ++;

		var 	wp = tmp[1], 
			watchArgs,
			wrap,
			code;

		watchArgs = [
			Gdb.wCtr,
			'"' + wp + '"', 
			'Array.prototype.slice.call(arguments)'
		].join(',');

		code = [
			'var ret = [' + wp + ', "' + wp + '"];',
			wp + ' = function() {',
				'return Gdb.watch(' + watchArgs + ');',
			'};',
			'return ret;'
		].join('\n');
		
		Gdb.wList[Gdb.wCtr] = Function("", code)();

		Gdb.raw('watchpoint ' + Gdb.wCtr + ' on ' + wp + ' set.');
	},

	s: function(tmp) {
		tmp.shift();

		var 	base = tmp[0],
			type,
			stack = [],
			foundCount = 0,
			// prevent recursion
			maxdepth = 4,
			curdepth = 0,
			val,
			term = tmp[1];

		function recurse(eObj) {
			curdepth++;

			if(curdepth > maxdepth) {
				return;
			}

			for(var e in eObj) {
				if(eObj.hasOwnProperty(e)) {
					type = typeof eObj[e];
					val = eObj[e];

					if(((type == 'number') || (type == 'string')) && 
					   val.toString().search(term) > -1) {
						foundCount++;
						Gdb.raw(stack.join('.') + '.' + e + ': ' + eObj[e].toString().substr(0,30));
					} else if(type == 'object') {
						stack.push(e);
						recurse(eObj[e]);
						stack.pop();
					}
				}
			}

			curdepth--;
		}

		stack.push(base);
		recurse(self[base]);

		if(!foundCount) {
			Gdb.raw(term + ' not found in ' + base);
		}
	},
				
	'?': function(){
		var d = [];
		for(i in Gdb.cmd) {
			d.push(i);
		}
		d.sort();
		Gdb.raw(d.join('<br>'));
	}
};
Gdb.clear = Gdb.cmd.clear;
Gdb.walk = function(eObj, noemit, hitIn) {
	if(!Gdb.input) {
		return;
	}
	var tmp,
	    o = {
			'Objects':[],
			'Functions':[],
			'Values':[]
		},
		map = {
			'object' : 'Objects',
			'function' : 'Functions',
			'boolean' : 'Values',
			'string' : 'Values',
			'number' : 'Values'
		},
	    ix,
	    len,
	    hit = hitIn || {},
		type,
		cat,
	    el,
		base = Gdb.input.value,
	    emit;

	if(eObj instanceof Array) {
		len = eObj.length;

		for(ix = 0; ix < len; ix++) {
			el = eObj[ix];
			o.push(el.toSource());
		}
	} else if(typeof eObj == 'string') {
		return o;
	} else {
		for(e in eObj) {
			if(hit[e]) {
				continue;
			} else {
				hit[e] = true;
			}

			try {
				type = typeof eObj[e];
				tmp = type;
				cat = map[type];

				emit = false;

				if(tmp == 'number') {
					emit = eObj[e];
				} else if(tmp == 'string') {
					emit = eObj[e].substr(0,30).replace(/</g, '&lt;').replace(/>/g, '&gt;');
				} else if(tmp == 'boolean') {
					emit = eObj[e].toString();
				} else if(tmp == 'function' && eObj == self) {
					continue;
				}

				if(emit) {
					emit = '(' + emit + ')';
				} else {
					emit = '';
				}

				o[cat].push('<span><a onclick=Gdb.extend("' + base + '",this' + (
						(tmp == 'function') ?
							',"function"' :
							''
						) +
					')>' + e + '</a> ' + emit + '</span>');
			} catch(ex) {
				o[cat].push('<span>' + e + ' (' + ex.toString().substr(0,20) + ')</span>');
			}
		}

		if(eObj.__proto__) {
			try {
				var toMerge = Gdb.walk(eObj.__proto__, true, hit);

				for(cat in o) {
					o[cat] = Array.concat(o[cat], toMerge[cat]);
				}
			} catch(ex) {
				alert(ex);
			}
		}
	}

	if(noemit) {
		return o;
	} else {
		var fillers = {Values:'<br>', Objects:'', Functions:''};
		for(cat in fillers) {
			if(o[cat].length) {
				Gdb.raw('<h3>' + cat + '</h3>' +
					o[cat].sort().join(fillers[cat])
				);
			}
		}
	}
}

Gdb.backup = function(el) {
	// we take the base value, add a nominal period, then
	// search and replace to remove excess then 1 period,
	// if necessary
	var set = Gdb.input.value.split('.');
	set.pop();
	
	Gdb.input.value = set.join('.') + '.' + el.innerHTML;
	Gdb.tabComplete();
}

Gdb.extend = function(base,el,type) {
	if(!el) {
		Gdb.input.value = base;

		Gdb.input.selectionStart = 
			Gdb.input.selectionEnd = 
			Gdb.input.value.length;
		return;
	} 

	// we take the base value, add a nominal period, then
	// search and replace to remove excess then 1 period,
	// if necessary
	var ap = '',
	    combined = [base, el.innerHTML].join('.').replace(/\.+/g, '.');

	if(type == 'function') {
		ap = '()';
	}

	Gdb.input.value = (combined + ap).replace(/^\./, '');

	if(!ap.length) {
		Gdb.tabComplete();
	}

	Gdb.input.selectionStart = base.length;
	Gdb.input.selectionEnd = Gdb.input.value.length;
}


Gdb.flash = function(){
	Gdb.data.className += ' inv';
	Gdb.input.className += ' inv';

	setTimeout(function(){
		Gdb.data.className = Gdb.data.className.replace(' inv', '');
		Gdb.input.className = Gdb.input.className.replace(' inv', '');
	}, 150);
}

Gdb.enter = function(el){
	Gdb.history.data.push(el.value);
	Gdb.history.ptr = Gdb.history.data.length;	

	tmp = el.value;
	el.value = "";

	// !! is the last command, like the shell
	tmp = tmp.replace(/!!/g, function(str, p1) {
		return Gdb.history.data[Gdb.history.data.length - 2];
	});

	// encapsulate code in ` and ` to be eval'd
	tmp = tmp.replace(/`([^`]*)`/g, function(str, p1) {
		return eval(p1);
	});

	tmp = tmp.split(' ');

	if(Gdb.cmd[tmp[0]]) {
		Gdb.cmd[tmp[0]](tmp);
	} else {
		try {
			self.$_ = eval(tmp.join(' '));
			if(self.$_ !== null) {
				Gdb.raw('<a onclick=Gdb.extend("' + tmp.join(' ').replace(/;$/,'') + '")>' + self.$_.toString() + '</a>');
			} else {
				Gdb.raw('(null)');
			}
		} catch(ex) {
			Gdb.raw(tmp.join(' ') + ': ' + ex.message);
		}
	}

	Gdb.data.scrollTop = Gdb.data.scrollHeight;
}

// get the maximum prefix between two strings
Gdb.prefixCheck = function(str1, str2) {
	var len = Math.min(str1.length, str2.length),
	    ix;

	for(ix = 0; ix < len; ix++) {
		if(str1.charAt(ix) != str2.charAt(ix)) {
			break;
		}
	}

	return str1.substr(0, ix);
}

Gdb.tabComplete = function(){
	var	input = Gdb.input, 
		toSend = input.value.replace(/\.$/g,''),
		maxPrefix = false;

	if(toSend.length == 0) {
		toSend = 'self';
	}

	try {
		eval(toSend);
		var toWalk = Function("", "return " + toSend)(),
		    tmp = input.value;

		if(typeof toWalk == 'undefined') {
			throw(0);
		} else {
			Gdb.raw(toSend);
			Gdb.walk(toWalk);

			// add a . if necessary for the next level heirarchy
			if(typeof toWalk == 'object') {
				if(tmp.charAt(tmp.length - 1) != '.') {
					input.value = tmp + '.';
				}
			}
		}
	} catch(ex) {
		// completion
		var splitUp = toSend.split('.'),
		    needle = splitUp.pop().toLowerCase(),
		    o = [],
		    last = false,
		    post = '',
		    lastType,
		    base = splitUp.join('.').replace(/^\./,''),
		    baseOrig = base,
		    baseStr = base;

		if(base.length == 0) {
			base = 'self';
		}

		try{
			base = Function("", "return " + base)();
		} catch(ex){
			Gdb('Failed to expand: ', baseOrig);
		}

		for(var ix in base) {
			if(ix.toLowerCase().indexOf(needle) ==  0) {
				if(!maxPrefix) {
					maxPrefix = ix;
				} else {
					maxPrefix = Gdb.prefixCheck(maxPrefix, ix);
				}

				lastType = typeof(base[ix]);
				o.push('&nbsp;<a onclick=Gdb.backup(this)>' + ix + '</a> (' + lastType + ')');
				last = ix;
			}
		}

		if(baseStr.length) {
			last = '["' + last + '"]';
		}

		if(o.length == 1) {
			if (lastType == 'object') {
				post = '.';
			}

			input.value = baseStr + last + post;

		} else if(o.length > 0){
			input.value = baseStr + maxPrefix;
			Gdb.raw(o.join('<br>'));
		} else {
			Gdb.flash();
		}
	}

	Gdb.data.scrollTop = Gdb.data.scrollHeight;

	Gdb.input.focus();
}
