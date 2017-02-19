
function messages () { 
	this.anumber = 1;
	this.mtypes = [];
}

messages.prototype.loadmessages = function (callback) { 

}

messages.prototype.registerMessageType = function	 (detail) { 
	this.mtypes.push (detail);
}

messages.prototype.getMessageType = function (type) { 
	for (t in this.mtypes) { 
		if (type == this.mtypes[t].type) { 
			return t;
		}
	}

	return false;
}

messages.prototype.updateMessage = function (detail) { 
	var type = this.getMessageType(detail.type);
	if (type === false) { return false; }

	var info = {};
	if (this.mtypes[type].uniqueToPlugin) { 
		info.pluginid = detail.pluginid;
	}
	info.uniqueid = detail.uniqueid;
	info.type = detail.type;
	var mess = global.db.findMessages (info);


}


module.exports = messages;	