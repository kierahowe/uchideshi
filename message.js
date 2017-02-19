

function Message () { 
	this.id = undefined;
	this.messageMeta = {};
	this.messageContent = [];
	this.messageTags = [];
	
	this.pluginid = '';
	this.uniqueid = '';
	this.type = '';
	this.timein = '';

	this.saved = false;
	this.saving = false;
}

Message.prototype.loadMessageById = function (id, callback) { 
	this.id = id;

	this.saved = true;
}

Message.prototype.setMessageId = function (id) { 
	this.id = id;
	this.saved = false;
}

Message.prototype.setPluginId = function (id) { 
	this.pluginid = id;
	this.saved = false;
}
Message.prototype.setUniqueId = function (id) { 
	this.uniqueid = parseInt(id);
	this.saved = false;
}
Message.prototype.setType = function (type) { 
	this.type = type;
	this.saved = false;
}
Message.prototype.setTimein = function (time) { 
	var t;

	if (typeof time == 'integer') { 
		t = time;
	} else { 
		var tmp = Date.parse(time);
		if (isNaN(tmp)) { 
			console.log ('error parsing date in message');
			t = Date.now() / 1000;
		}
		t = tmp / 1000;
	}
	this.timein = t;
	this.saved = false;
}

Message.prototype.updateMessageMeta = function (data) { 
	this.messageMeta = global.mergeAA(this.messageMeta,data);
	this.saved = false;
}
Message.prototype.updateMessageMetaItem = function (name, val) { 
	this.messageMeta[name] = val;
	this.saved = false;
}

Message.prototype.updateMessageContent = function (data, type, callback) { 
	if (typeof type == 'undefined' ) { type = 'email_raw'; }
	var self = this;

	if (type == 'email_raw' || type == 'email_rawbuffer') { 
		// need to decode the raw
		var MailParser = require ('mailparser').MailParser;
		var dataout = new MailParser({ });

		dataout.on("end", function(mail){
			//console.log ('message parsed', mail);

			// Load the headers
			if (typeof mail.headers != 'undefined') { 
				self.updateMessageMeta (mail.headers);
			}
			// Load the content (html, rtf and text)
			if (typeof mail.html != 'undefined') { 
				self.messageContent.push (
						{ type: 'html', content: mail.html }
					);
			}
			if (typeof mail.rtf != 'undefined') { 
				// TODO:  make this work
				// self.messageContent.push (
				// 		{ type: 'rtf', content: mail.rtf }
				// 	);
			}
			if (typeof mail.text != 'undefined') { 
				self.messageContent.push (
						{ type: 'text', content: mail.text }
					);
			} else { 
				// TODO:  need to process the other types into plain text				
			}
			
			// Load the attachments (attachments)
			if (typeof mail.attachments != 'undefined') { 
				for (var i = 0; i < mail.attachments.length; i++) { 
					 self.messageContent.push (
							{ type: 'attachment', content: mail.attachments[i] }
						);
				}
			}

			callback ();
			console.log ("end parsing... ");
			self.saved = false;
		});

		if (type == 'email_rawbuffer') { 
			mailparser.write(data);
		} else { 
			var fs = require("fs");
			data.pipe(dataout);
		}
	} else {
		for (var i = 0; i < data.length; i++) { 
			 this.messageContent.push (
					{ type: 'text', content: data[i] }
				);
		}
//		this.messageContent = global.mergeAA(this.messageContent,data);
		this.saved = false;
	}
}

Message.prototype.updateMessageTags = function (data) { 
	this.messageTags = global.mergeAA(this.messageTags,data);
	this.saved = false;
}

Message.prototype.saveMessage = function (name, value) { 
	var self = this;

	if (this.saving) { 
		// we don't want to double save this
		// // TODO:  set a timer to try again in a bit
		
		return; 
	}
	this.saving = true;
	var o = global.db.updateMessage ( {
			id: this.id, 
			type: this.type, 
			pluginid: this.pluginid, 
			uniqueid: this.uniqueid, 
			meta: this.messageMeta, 
			content: this.messageContent, 
			tags: this.messageTags, 
		}, function (id) { 
			if (typeof id != 'undefined') { 
				self.id = id;
			} else {
				console.log ('Error saving message');	
			}
			self.saving = false;
		}
	);

}

module.exports = Message;	