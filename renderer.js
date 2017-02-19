global.runType = 'renderer';


const remote = require('remote');  
var dataInput = remote.getCurrentWindow().dataInput;

var path = require("path");
settings = require(path.resolve(".") + '/settings');

global.settings = new settings();

// Requirements
var Error = require(path.resolve(".") + '/error');

var p = require(path.resolve(".") + '/plugins');
global.plugins = new p();

global.settings.loadSettings (function () {});

addCss ();

window.onload=function(){
	global.plugins.startCom ();
	global.plugins.LoadPlugins ();
	
	if (typeof global.plugins.onload === 'function')  { 
		global.plugins.onload();
	}
};

//console.log (global.db);

function runMenu (type) { 

	switch (type){
		case 'refreshpage':
			this.location.reload ();
			break;
		case 'settings':
		 	global.plugins.callFunction ('openNewWindow', ['settings.html', {devTools: true, center: true, width: 800, height: 500} ]);
			break;
		case 'console':
			this.openDevTools();
			break;
	}

}

function addCss() { 
	// Load in the CSS from the theme or the base
	var link = document.createElement( "link" );
	var fs = require('fs');
	if (fs.existsSync(path.resolve(".") + '/' + global.settings._.locationMods + '/' + global.settings._.theme + '/style.css')) {
		link.href = path.resolve(".") + '/' + global.settings._.locationMods + '/' + global.settings._.theme + '/style.css';		
	} else { 
		link.href = path.resolve(".") + '/basetheme/' + 'style.css'; 
	}
	link.type = "text/css";
	link.rel = "stylesheet";
	link.media = "screen,print";
	document.getElementsByTagName( "head" )[0].appendChild( link );
}


global.mergeAA = function (a, b) { 
	var out = a;
	for (n in a) { 
		out[n] = a[n];
	}

	return out;
}