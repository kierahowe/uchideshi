
global.runType = 'main';

global.CURRENTVERSION = '0.1.0';

var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Requirements
var Error = require('./error');


settings = require('./settings');
global.settings = new settings();

d = require('./database');
global.db = new d(global.settings._.dbtype, global.settings._.dbname, global.settings._.dbuser, global.settings._.dbpass);

var p = require('./plugins');
global.plugins = new p();

// Report crashes to our server.
//require('crash-reporter').start();

global.windowList = []; 

messages = require('./messages');
global.messages = new messages();


/*  When everything closes */
app.on('window-all-closed', function() {
// if (process.platform != 'darwin') {
	app.quit();
// }
});

/*  When ready */
app.on('ready', function() {  
	global.plugins.startCom ();

// What queries are displayed where

	global.db.getTables ('settings', function (err, rows) { 
		if (err !== null || rows === null || rows.length == 0) {
			global.db.createTable ('settings', [ { name: 'name', type: 'varchar(100)',primary: true }, { name: 'val',  type: 'text'}]);

			// TAGS FOR EVERYTHING
			global.db.createTable ('tags', [ 
		  			{ name: 'id', type: 'integer', primary: true, auto: true}, 
		  			{ name: 'tagname', type: 'varchar(255)' },
 			]);

			// Queries
			global.db.createTable ('queries', [ 
		  			{ name: 'id', type: 'integer', primary: true, auto: true}, 
		  			{ name: 'queryname', type: 'varchar(255)' },
		  			{ name: 'params', type: 'text' },
 			]);

			// What queries are displayed where
 			global.db.createTable ('queriesdisplay', [ 
 					{ name: 'id', type: 'integer', primary: true, auto: true },
		  			{ name: 'qid', type: 'integer', foreign: [ 'queries', 'id' ]}, 
		  			{ name: 'overridename', type: 'varchar(255)' },
		  			{ name: 'type', type: 'varchar(20)' },
		  			{ name: 'parent', type: 'integer', foreign: [ 'queriesdisplay', 'id' ] },
		  			{ name: 'params', type: 'text' },
		  			{ name: 'ord', type: 'integer' }
 			]);

			// Messages
			global.db.createTable ('messages', [ 
					{ name: 'id', type: 'integer', primary: true, auto: true}, 
					{ name: 'pluginid', type: 'integer' }, 
					{ name: 'uniqueid', type: 'varchar(255)' }, 
					{ name: 'type',  type: 'varchar(100)' },
					{ name: 'timein',  type: 'datetime' }
			]);
			global.db.createTable ('messagecontent', [ 
		  			{ name: 'id', type: 'integer', primary: true, auto: true}, 
		  			{ name: 'messageid', type: 'integer', foreign: [ 'messages', 'id' ]}, 
		  			{ name: 'contenttype', type: 'varchar(20)' },
		  			{ name: 'content', type: 'text' }
 			]);
			global.db.createTable ('messagemeta', [ 
		  			{ name: 'id', type: 'integer', primary: true, auto: true}, 
		  			{ name: 'messageid', type: 'integer', foreign: [ 'messages', 'id' ]}, 
		  			{ name: 'name', type: 'varchar(120)' },
		  			{ name: 'val', type: 'text' }
 			]);
			global.db.createTable ('messagetags', [ 
		  			{ name: 'tagid', type: 'integer', foreign: [ 'tags', 'id' ]}, 
		  			{ name: 'messageid', type: 'integer', foreign: [ 'messages', 'id' ]} 
 			]);

		  console.log ("Created database");
		}

		RunStartup ();
	});
});

function RunStartup () { 
	if (global.db == null) { 
		console.log ("Error:  cannot open database");
		// todo:  add function to ask user for database selection
		exit ();
	}
	
	global.plugins.addValidFunction ('openNewWindow', remoteNewWindow);
	global.db.setupFunctions ();

	global.settings.loadSettings (function () { 
		global.plugins.LoadPlugins ();
		var url = global.settings._.mainWindow;
		var pos = global.settings._.mainWindowPosition;
		//pos.devTools = true;
		openNewWindow (url, pos);
	});
}

function remoteNewWindow (param, callback) { 
	var data = param[2];
	var position = param[1];
	var url = param[0];
	var ret = openNewWindow (url, position, data);

	callback (ret);
}

function openNewWindow (url, position, data) { 
	// Loads new window
	// 

	console.log ("new window load:", position);

	if (typeof position === 'undefined') { 
		data = url[2];
		position = url[1];
		url = url[0];
	}

	var fs = require('fs');
	if (fs.existsSync('node_modules/' + global.settings._.theme + '/' + url)) {
		url = 'node_modules/' + global.settings._.theme + '/' + url;		
	} else { 
		url = 'basetheme/' + url; 
	}

	console.log (url);

	if (url.substring(0, 7) != "file://" && 
	  url.substring(0, 7) != "http://" && 
	  url.substring(0, 8) != "https://") { 
		url = 'file://' + __dirname + '/' + url;
	}

	var ret = global.plugins.callHook ('newWindow', { url: url, position: position});
	for (var r in ret) { 
		if (ret[r].cancel) { return 0; }
	}

	if (global.windowList.length > 20) { 
		console.log ('Error: Too many windows');
		return 0; 
	}

	var atomScreen = require('screen');
	var displist = atomScreen.getAllDisplays();
	// Create the browser window.

	var pridisp = null;
	if (displist.length > 1) { 
		for (var i = 0; i < displist.length; i ++) { 
		  pridisp = displist[i];
		}
	} else { 
		pridisp = displist[0];
	}


	if (position.width == null) { position.width = pridisp.size.width / 2; }
	if (position.height == null) { position.height = pridisp.size.height / 2; }

	var args = { width: position.width, height: position.height};

	mainWindow = new BrowserWindow(args);
	mainWindow.once('ready-to-show', function () {  
		mainWindow.show();
	});

	if (position.devTools) { 
		mainWindow.openDevTools();
	}

	var bounds = {width: position.width, height: position.height};
	var flg = 0;
	if (position.x != null && typeof position.x != 'undefined' ) { bounds.x = position.x; flg = 1; }
	if (position.y != null && typeof position.y != 'undefined' ) { bounds.y = position.y; flg = 1; }

	if (position.center) { 
		bounds.x = pridisp.size.width / 2 - position.width / 2;
		bounds.y = pridisp.size.height / 2 - position.height / 2;
		flg = 1;
	}

	if (position.dock == 'right') { 
		bounds.height = pridisp.size.height
		bounds.y = 0;
		bounds.x = pridisp.size.width - args.width; 
		flg = 1;
	}

	if (flg == 1) {
		mainWindow.setBounds (bounds);
	}
	if (position.max == true) { 
		mainWindow.maximize();
	}

	if (position.alwaysOnTop) { 
		mainWindow.setAlwaysOnTop(position.alwaysOnTop);
	}

	mainWindow.dataInput = data;

	mainWindow.loadUrl(url);
	mainWindow.on('closed', closeWindow);

	global.windowList.push (mainWindow);

	global.plugins.callHook ('newWindowLoaded', { BWWindow: mainWindow });
	return 1;
}

function closeWindow () {
	var index = global.windowList.indexOf(this);
	if (index > -1) {
		global.windowList.splice(index, 1);
	}
}


function mergeArray(array1,array2) {
  for(item in array2) {
    array1[item] = array2[item];
  }
  return array1;
}


global.mergeAA = function (a, b) { 
	var out = a;
	for (n in b) { 
		out[n] = b[n];
	}

	return out;
}