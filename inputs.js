/*  
	Class: inputs
	Description:  Loaded by the plugins class to startup and maintain running inputs
	Notes:  
		- Load, based on settings, all inputs
		- Handle adding and removing them 
		- 

	Updates: 
		July 21, 2016:  KJPH: add comments to existing code


*/

function inputs () { 
	// Constructor - called from plugins
	// Load up all inputs according to settings
	
	this.inputs = [];	

	// Add valid IPC functions 
	global.plugins.addValidFunction ('getInputs', function (param, callback) { 
	 	global.plugins.inputs.getAllInputs (param, callback);
	});
	global.plugins.addValidFunction ('getActiveInput', function (param, callback) { 
	 	global.plugins.inputs.getActiveInput (param, callback);
	});
	global.plugins.addValidFunction ('getActiveInputs', function (param, callback) { 
	 	global.plugins.inputs.getActiveInputs (param, callback);
	});

}

inputs.prototype.startInputs = function () { 
	// Called after all plugins are loaded.  
	// - Plugins load and register their inputs, then we startup any active inputs 
	// - Inputs are only started if running in main. 

	if (global.runType == 'main') { 
		this.getActiveInputs (undefined, function (inp) { 
			console.log ("activein: " , inp);
			for (i in inp) {
				if (typeof inp[i] == 'undefined') { continue; } 
				console.log(inp[i]);
				var tmpreq = inp[i]['require'];
				var tmp = new tmpreq(inp[i].id, inp[i].settings);
				tmp.startup ();	
			}
		});
	}
}

inputs.prototype.getAllInputs = function (param, callback) { 
	// Called from IPC - executed by main
	// Returns all available inputs which could be configured

	var out = [];
	for (var x in this.inputs) { 
		console.log ("input: ");
		console.log (this.inputs[x]);
		var inp = this.inputs[x]['require'];
//		var tmp = new inp(true);
		var n = inp.prototype.getInfo ();
			
		// if (typeof tmp.getInfo == 'function') { 
			out.push (n);
//		}
	}
	
	callback (out);
}

inputs.prototype.getActiveInput = function (param, callback) { 
	// Called from IPC - executed by main
	//  param:  
	//  	id:  [int]   - the ID of the input
	// Returns an active input identified by "id"

	this.getActiveInputs (param, function (out) { 
		console.log("Active inputs: ", out);
		if (out.length > 0) { 
			out = out.pop ();
		}
		callback (out);
	});

}

inputs.prototype.getActiveInputs = function (param, callback) { 
	// Called from IPC - executed by main
	// Returns all available configured active inputs

	var out = [];
	var inputlist = {};

	// Get the currently configured inputs
	for (var x in this.inputs) { 
		var inp = this.inputs[x]['require'];
//		var tmp = new inp(true);
//		if (typeof tmp.getInfo == 'function') { 
			n = inp.prototype.getInfo ();
			n['require'] = this.inputs[x]['require'];
			inputlist[n['slug']] = n;
//		}
	}

	for (var y in global.settings._['inputs']) { 
		if (typeof inputlist[global.settings._['inputs'][y]['slug']] == 'undefined') { 
			continue;
		}

		if (typeof param === 'undefined' || typeof param.id === 'undefined' || 
			param.id == global.settings._['inputs'][y]['id']) {
				var o = {};
				o['id'] = global.settings._['inputs'][y]['id'];
				o['slug'] = global.settings._['inputs'][y]['slug'];
				o['name'] = inputlist[o['slug']]['name'];
				o['description'] = inputlist[o['slug']]['description'];
				o['settingFields'] = inputlist[o['slug']]['settingFields'];
				o['require'] = inputlist[o['slug']]['require'];
				o['settings'] = global.settings._['inputs'][y]['settings'];
				out.push(o);
		}
	}

	console.log (out);
	callback (out);
}

inputs.prototype.delActiveInput = function (num) { 
	for (var y in global.settings._['inputs']) { 
		if (global.settings._['inputs'][y]['id'] == num) { 
			global.settings.deleteSubSetting('inputs', y);
			break;
		}
	}

	return 0;
}

inputs.prototype.settingChange = function (id, name, val) { 
	for (var y in global.settings._['inputs']) { 
		if (global.settings._['inputs'][y]['id'] == id) { 
			global.settings._['inputs'][y]['settings'][name] = val;
			console.log ("Found setting: " + y + " -- " + name);
			global.settings.updateSetting('inputs', y, global.settings._['inputs'][y]);
			console.log (global.settings._['inputs'])
			break;
		}
	}

	return 0;
}

inputs.prototype.addActiveInput = function (slug) {
	// Called from rend to add an input (from settings page)
	//  
	var id;
	id = global.settings._['inputCtr'];
	if (typeof id == 'undefined' || id == null) { id = 0; }
	//alert (id);
	id ++;
	global.settings.updateSetting('inputCtr', id);
	return global.settings.addSubSetting('inputs', {"id": id, "slug":slug, "settings":{} });
}

inputs.prototype.registerInput = function (req) { 
	this.inputs.push ({ "require": req, "items": [] });
}



module.exports = inputs;
