/*  
	Class: settings
	Description:  loaded into global when either main or renderer starts
	Notes:  
		- All settings are loaded into the _ variable on startup of either main or rend
		- The renderer never touches the database.  Whenever it needs to update settings, it should call 
			the main so that notifications can be sent to all renderers
		- Assume the main is alway the correct settings, and load from there

	Updates: 
		July 21, 2016:  KJPH: add comments to existing code


*/


function settings () { 
	//  Global class
	this.database = 1;

	// Load in the initial settings.  The database setup is in here
	// TODO: this may not be required anymore or can be moved
	this._ = require("./settings.json");
}

settings.prototype.getAllSettings = function (param, callback) { 
	// Called from IPC - executed by main, always
	// returns all settings back to the renderer

	callback (global.settings._);
}

settings.prototype.loadSettings = function (callback) { 
	// Called from both main and renderer  (main.js or renderer.js)
	// Loads all settings into the _ variable.   
	//   Main loads from the database
	//   Rendere loads from main via IPC "getAllSettings"
	// Adds valid ipc functions
	
	var ret = global.plugins.callHook ('loadSettingsStart', this);
	for (var r in ret) { 
		this._ = global.mergeAA (this._, r);
	}
	
	if (global.runType == 'main') { 
		// goto database and load settings
		tmpthis = this;
		global.db.getKeyValues('settings', [ 'name', 'val' ], '', function (kv) { 	
			// merge settings loaded from DB to the _ 
			global.settings._ = global.mergeAA (global.settings._, kv);

			// HOOK for fish
			var ret = global.plugins.callHook ('loadSettingsEnd', global.settings);
			for (var r in ret) { 
				global.settings._ = global.mergeAA (global.settings._, r);
			}

			// Add valid IPC functions 
			global.plugins.addValidFunction ('getAllSettings', function (param, callback) { 
				return global.settings.getAllSettings(param, callback);
			});

			global.plugins.addValidFunction ('settingUpdated', function (param, callback) { 
				return global.settings.settingUpdated(param, callback);
			});

			// callback
			callback ();
		});
	} else { 

		// make the IPC call to the main to get the settings
		ret = global.plugins.callFunction ('getAllSettings');
		if (ret !== null) { 
			global.settings._ = ret;
		}
	}
}

settings.prototype.settingUpdated = function (param, callback) { 
	// Running in main, Called via IPC from the renderer to notify of information update
	// updates the _ with the new (passed) data, then writes that key to the database

	var name = param['name'];
	var item = param['item'];
	var val = param['value'];

	// update
	if (typeof item == 'undefined') { 
		this._[name] = val;
	} else { 
		this._[name][item] = val;
	}

	var o = {};
	o[name] = this._[name];

	// Write to database
	global.db.setKeyValue ('settings', 'name', 'val', o);
	callback ('good for you');
}

settings.prototype.updateSetting = function (name, item, value) { 
	//  Called from either main or rend. 
	//  Updates a given setting

	if (typeof value == 'undefined') { 
		value = item;
		item = undefined;
	}

	// if there is a subitem, update only the sub item
	if (typeof item == 'undefined') { 
		console.log ("upcated " + name, value);
		this._[name] = value;
	} else { 
		console.log ("updated " + name + ' on ' + item, value);
		if (typeof this._[name] == 'undefined') { this._[name] = []; }
		this._[name][item] = value;
	}


	if (global.runType == 'main') { 
		// TODO:   Call renderers to let them know there is a setting update
	} else { 
		// Call main Via IPC and tell it to update the setting
		global.plugins.callFunction ('settingUpdated', {'name':name, 'item': item, 'value': value });
	}
}

settings.prototype.addSubSetting = function (name, value) { 
	// Called from main or rend
	// Adds a new setting to an array at index name in _
	
	if (typeof this._[name] == 'undefined') { 
		this._[name] = []; 
	}
	console.log (this._[name]);
	// Add new item
	var x = this._[name].push (value);

	console.log ("setting added", value);
	// Tell the main to update setting
	global.plugins.callFunction ('settingUpdated', {'name':name, 'value': this._[name] });

	return x;
}

settings.prototype.deleteSubSetting = function (name, inum) { 
	// Called from main or rend
	// remove the item at index inum
	
	if (typeof this._[name] == 'undefined') { 
		return false;
	}
	var x = this._[name].splice(inum, 1);

	// Tell the main to update setting
	global.plugins.callFunction ('settingUpdated', {'name':name, 'value': this._[name] });

	return x;
}

settings.prototype.saveSettings = function () { 
	// TODO:  Save all the settings
	//   decide if you actually want this, because everything should save on an ongoing basis

}


module.exports = settings;	