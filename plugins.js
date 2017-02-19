/*  
	Class: plugins
	Description:  Loaded by the startup of either the renderer or main to operate plugins
	Notes:  
		- Controls the plugins including add/remove/edit 
		- Has the inputs and taggers connected here

	Updates: 
		July 22, 2016:  KJPH: add comments to existing code


*/


var hookList = {};
var validfunc = {};
var templates = {};


function plugins () { 
	this.pathlist = {};
	this.pluginList = [];

	this.inputs = null;
	this.taggers = [];
}

plugins.prototype.LoadPlugins = function () { 
	// Setup the plugins.  Called from main or rend.  
	// 
	console.log ("Loading plugins...");

	// Add valid IPC functions
	global.plugins.addValidFunction ('getAllResources', function (param, callback) { 
		global.plugins.getAllResources (param, callback);
	});
	global.plugins.addValidFunction ('getTaggers', function (param, callback) { 
	 	global.plugins.getAllTaggers (param, callback);
	});

	// Load the inputs
	var inp = require ('./inputs');
	this.inputs = new inp ();

	// Load all plugins.  
	for (var plugin in global.settings._.pluginList) { 
		var pname = global.settings._.pluginList[plugin].name;
		this.startPlugin (plugin, pname);
	}

	// now that the plugins are loaded, startup any inputs that are configured.
	this.inputs.startInputs ();

}

plugins.prototype.getAllTaggers = function (param, callback) { 
	var out = [];
	for (var x in this.taggers) { 
		if (typeof this.taggers[x].getInfo == 'function') { 
			out.push (this.taggers[x].getInfo ());
		}
	}
	
	callback (out);
}


plugins.prototype.registerTagger = function (req) { 
	this.taggers.push ({ "require": req, "items": [] });
}

plugins.prototype.addTemplate = function (name, file) { 
	templates[name] = file;
}

plugins.prototype.addValidFunction = function (name, func) { 
	console.log ("Adding valid function for remote comms: " + name + "");
	validfunc[name] = func;
}

plugins.prototype.getAllResources = function (param, callback) { 
	var fs = require("fs");
	var type = param['type'];

	fs.readdir ("./" + global.settings._.locationMods, function (err, files) { 
		var out = [];

		var ctr = 0;
		for (var x in files) { 
			pname = files[x];
			if (fs.existsSync(settings._.locationMainDir + settings._.locationMods + pname + '/' + pname + '.js') && 
				fs.existsSync(settings._.locationMainDir + settings._.locationMods + pname + '/' + 'package.json')) { 
  				
  				var pack = require(settings._.locationMainDir + settings._.locationMods + pname + '/' +'package.json');
  				if (pack['udrequiredversion'] != null && pack['udrequiredversion'] != "" && 
  						(typeof type == 'undefined' || pack['udmodule'] == type)) {  
  					var en = false;

  					if (pack['udmodule'] == 'theme') { 
  						if (global.settings._.theme == pname) { en = true; };
  					} 

  					if (pack['udmodule'] == 'plugin') { 
	  					for (var plugin in global.settings._.pluginList) { 
							if (global.settings._.pluginList[plugin].name == pname) { en = true; } 
						}
					}	
					
  					out.push (
  					{
  						'id': ctr++, 
  						'name':pack['name'], 
  						'description':pack['description'], 
  						'version':pack['version'], 
  						'dirname': pname, 
  						'enabled': en, 
  						'reqversion': pack['udrequiredversion'], 
  						'type': pack['udmodule']
  					});
  				}
  			}
		}
		callback (out);
	});
	
}

plugins.prototype.getAllTaggers = function (param, callback) { 
	var out = [];
	for (var x in this.taggers) { 
		if (typeof this.taggers[x].getInfo == 'function') { 
			out.push (this.taggers[x].getInfo ());
		}
	}
	
	callback (out);
}

plugins.prototype.startPlugin = function (plugin, pname) {
	console.log ("Loading plugin: " + pname);

	var fs = require("fs");
	if (fs.existsSync(settings._.locationMainDir + settings._.locationMods + pname + '/' + pname + '.js')) {
			var plug = require(settings._.locationMainDir + settings._.locationMods + pname + '/' + pname + '.js');
			this.pluginList[plugin] = {};
			this.pluginList[plugin].inst = new plug ();
		if (typeof this.pluginList[plugin].inst.onLoad === 'function')  { 
			this.pluginList[plugin].inst.onLoad(settings, plug);
		} else { 
			console.log ("plugin.onLoad doesn't exist: " + pname);
		}

		console.log ("Done plugin: " + pname);
	} else { 
		console.log ("plugin file doesn't exist: " + pname);
	}
}

plugins.prototype.startCom = function () { 

	//var ipc = require ('ipcRenderer');
	// event.sender.send('asynchronous-message', 'pong');
	// console.log(ipcRenderer.sendSync('synchronous-message', 'ping')); // prints "pong"
	var ipc = require('ipc');

	//ipc.on('mainCom', communicationIn);

	if (global.runType == 'renderer') { 
		ipc.on('mainCom', communicationIn);
	} else if (global.runType == 'main') { 
		ipc.on('mainCom', communicationIn);
	}
}

plugins.prototype.callFunction = function (fname, param) { 
	var ipc = require('ipc');

	var callout =  { 
		type: 'function', 
		name: fname, 
		detail: param
	};

	return ipc.sendSync('mainCom', callout);
}

function communicationIn (event, arg) {
	if (global.runType == 'main') { 
		console.log ('Recieve IPC: ' + arg.name);
	}

	if (arg.type == 'function') { 
		if (typeof validfunc[arg.name] === 'function')  { 
			validfunc[arg.name] (arg.detail, function (ret) { 
				console.log ("returned function items for " + arg.name);
				if (typeof ret === 'undefined') { ret = false; }
				event.returnValue = ret;
			});
		} else { 
			console.log ("Recieved a function call which was not a function: " + arg.name);
			console.log (validfunc[arg.name]);
			event.returnValue = [];
		}
	}
	if (arg.type == 'ping') { 
		event.returnValue = 'Pong';		
	}

	// event.returnValue = { ping2: 'pong' };
	// if (arg == "ping") { 
	// 	event.sender.send('mainCom', 'pong2');
	// }
}


plugins.prototype.callHook = function (hookname, param) { 
	for (var hitem in hookList[hookname]) { 
		if (typeof hookList[hookname][hitem].func === 'function')  { 
			hookList[hookname][hitem].func(param);
		} else { 
			console.log ("hook function doesn't exist: " + hookList[hookname][hitem].func);
		}
	}
	return [];
}

plugins.prototype.registerHook = function (hookname, callback) { 
	if (typeof hookList[hookname] === 'undefined') { 
		hookList[hookname] = [];
	}
	hookList[hookname].push({ func: callback});
}

// plugins.prototype.importTemplatePart = function (template, callback) { 

// 	if (typeof templates[template] === 'undefined') { 
// 		return false;
// 	}
	
// 	var fs = require('fs')
// 	fs.readFile("./" + templates[template], 'utf8', function(err, data) {
//   		callback (data);
//   	});

//   	return true;
// }

// plugins.prototype.LoadList = function () { 
// 	console.log ("list it");
// }



module.exports = plugins;

