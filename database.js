
var Message = require('./message');

var db;
var type;

function database (	dbtype, dbname, dbuser, dbpass) {
	this.ConnectDatabase (dbtype, dbname, dbuser, dbpass);
}

database.prototype.ConnectDatabase = function (dbtype, dbname, dbuser, dbpass) { 
	type = dbtype;
	console.log ("Open database: " +  dbtype+ '://' + dbname + '::' + dbuser + '/' + dbpass);

	this.connected = false;
	this.dbinst = null;

	switch (dbtype) { 
		case 'sqlite':
			console.log ('db: ' + dbname);
			var sqlite3 = require('sqlite3').verbose();
			this.dbinst = new sqlite3.Database(dbname);
			if (this.dbinst) { 
				this.connected = true;
			} else { 
				console.log ("Failed to open the database");
			}
			break;
	}

}

database.prototype.setupFunctions = function () {
	global.plugins.addValidFunction ('getQueries', function (param, callback) { 
		global.db.getQueries (param, callback); 
	});
	global.plugins.addValidFunction ('moveDashQuery', function (param, callback) { 
		global.db.moveDashQuery (param, callback); 
	});
	global.plugins.addValidFunction ('deleteDashQuery', function (param, callback) { 
		global.db.deleteDashQuery (param, callback); 
	});
	global.plugins.addValidFunction ('updateDashQuery', function (param, callback) { 
		global.db.updateDashQuery (param, callback); 
	});
	global.plugins.addValidFunction ('searchQueries', function (param, callback) { 
		global.db.searchQueries (param, callback); 
	});
	global.plugins.addValidFunction ('getMessages', function (param, callback) { 
		global.db.getMessages (param, callback); 
	});
} 


database.prototype.searchQueries = function (param, callback) { 
	var out = [];
	
	var sqlstmt = "SELECT * FROM queries B WHERE queryname LIKE ?";
	this.dbinst.all(sqlstmt, ['%' + param['term'] + '%'], function (err, rows) { 
		callback(rows);
	});
}

database.prototype.updateDashQuery = function (param, callback) { 
	var out = null;
	var sqlstmt = '';

	var id = param['id'];
	var self = this;

	if (id == null) { 
		var qid = param['qid'];
		var type = param['type'];
		var destid = param['destid'];
		var postype = param['postype'];
		var overname = param['overridename'];

		// there are 3 possibles on postype:  child, above, even
		if (postype == 'child') { 
			sqlstmt = "SELECT ord,parent FROM queriesdisplay WHERE type=? AND parent=? ORDER BY ord";
		} else { 
			sqlstmt = "SELECT ord,parent FROM queriesdisplay WHERE type=? AND id=?";
		}
		self.dbinst.get (sqlstmt, [type, destid], function (err, row) { 
			var tmpparent = row.parent;
			var tmpord = row.ord;
			
			sqlstmt = 'UPDATE queriesdisplay SET ord=ord + 1 WHERE type=? AND ord >' + ((postype == 'above')?'=':'') + '?';
			self.dbinst.run (sqlstmt, [type,tmpord], function () { 			
				sqlstmt = 'INSERT INTO queriesdisplay (qid, type, parent, ord, overridename) values (?, ?, ?, ?, ?)';
				self.dbinst.run (sqlstmt, [qid,type,tmpparent,tmpord + ((postype == 'above')? 0:1),overname]);
				callback (this.lastID);
			});
		});
	}


}

database.prototype.deleteDashQuery = function (param, callback) { 
	var out = "";
	console.log ("Delete Query: ", param);

	var srcid = param['srcid'];
	var type = param['type'];

	var sqlstmt = "DELETE FROM queriesdisplay WHERE type='" + type + "' AND (parent = " + srcid + ")";
	this.dbinst.run (sqlstmt);
	sqlstmt = "DELETE FROM queriesdisplay WHERE type='" + type + "' AND (id = " + srcid + ")";
	this.dbinst.run (sqlstmt);

	callback (out);
}

database.prototype.moveDashQuery = function (param, callback) { 
	var out = "";

	var srcid = param['srcid'];
	var type = param['type'];
	var destid = param['destid'];
	var postype = param['postype'];

	console.log ("move Query: ", param);
	var sqlstmt = '';
	if (postype == 'child') { 
		sqlstmt = 'UPDATE queriesdisplay SET parent = ? WHERE type=? AND (id = ?)';
		this.dbinst.run (sqlstmt, [destid,type,srcid]);
		callback (out);
	} else { 
		sqlstmt = "SELECT ord,parent FROM queriesdisplay WHERE type=? AND id=?";

		var self = this;
		this.dbinst.get (sqlstmt, [type, destid], function (err, row) { 
			var tmpparent = row.parent;
			var tmpord = row.ord;
			console.log ("got item: ", row);

			sqlstmt = 'UPDATE queriesdisplay SET ord=ord + 1 WHERE type=? AND ord >' + ((postype == 'above')?'=':'') + '?';
			console.log (sqlstmt, [type, tmpord]);
			self.dbinst.run (sqlstmt, [type,tmpord], function () { 
				if (postype == 'above') { 
					sqlstmt = "UPDATE queriesdisplay SET parent=?,ord=? WHERE type=? AND (id = ?)";
					console.log (sqlstmt,[tmpparent,tmpord,type,srcid]);
					self.dbinst.run (sqlstmt, [tmpparent,tmpord,type,srcid], function () { 
						callback (out);
					});
				} else {
					sqlstmt = "UPDATE queriesdisplay SET parent=?,ord=? WHERE type=? AND (id = ?)";
					console.log (sqlstmt,[tmpparent,tmpord + 1,type,srcid]);
					self.dbinst.run (sqlstmt, [tmpparent,tmpord + 1,type,srcid], function () { 
						callback (out);
					});
				}
			});
		});
	}

	//callback (out);
}

database.prototype.getQueries = function (param, callback) { 
	var type;
	var tree;
	if (typeof param == 'undefined'){
		type = '';
		tree = false;
	} else { 
		type = param['type'];
		tree = param['tree'];
		if (type == null || typeof type == 'undefined') { type = ''; }
		if (tree == null || typeof tree == 'undefined') { tree = true; }
	}

	var sqlstmt = 'SELECT A.id,B.id as qid,A.overridename,B.queryname,B.params,A.parent,A.ord ' + 
					' FROM queriesdisplay A LEFT OUTER JOIN queries B ON A.qid=B.id WHERE 1=1 ';
	if (type !== '') { 
		sqlstmt += "AND A.type='" + type + "' ";
	}
	sqlstmt += ' ORDER BY A.ord';
	console.log (sqlstmt);
	this.dbinst.all(sqlstmt, function (err, rows) { 
		if (err != null) { 
			console.log ('error getting queries: ' + sqlstmt);
			console.log (err);
			callback (null);
		} else {

			if (!tree) { 
				callback (rows);
			} else {
				var f = function (id, level) { 
					if (level > 10) { return []; }
					var out = [];
					var ctr = 0;
					for (i in rows) {
						if (rows[i]['parent'] == id) { 
							out[ctr] = rows[i];
							out[ctr]['name'] = (rows[i]['overridename'] != null && rows[i]['overridename'] != '')?rows[i]['overridename']:rows[i]['queryname'];
							out[ctr]['nodes'] = f (rows[i]['id'], level + 1);
							ctr ++;
						}
					}

					return out;
				}
				var out = f(null, 0);
				callback (out);
			}
		}
	});
}

database.prototype.getTables = function (tables, callback) { 
	var sqlstmt = "SELECT name FROM sqlite_master WHERE type='table' ";

	if (tables !== null) { 
		sqlstmt += " and name like '%" + tables + "%'";
	}

	this.dbinst.all(sqlstmt, callback);
}



database.prototype.createTable = function (name, fields) { 
	// name: name of table
	// fields: [
	// 			{ name: 'id',  type: 'integer', primary: true, auto: true },
	// 			{ name: 'something',  type: 'varchar(100)', foreign: [ 'table', 'row'] },
	//			...
	// 		]

	var sqlstmt = "CREATE TABLE " + name + " (";
	flg = 0;
	var pri = [];
	var foreign = [];

	for (var n in fields) { 
		if (flg != 0) { sqlstmt += ","; }
		sqlstmt += fields[n]['name'] + ' ' + fields[n]['type'] + ' ';
		if (fields[n]['primary']) { pri.push(fields[n]['name']); }  
		if (fields[n]['foreign']) { foreign.push([ fields[n]['name'], fields[n]['foreign'][0], fields[n]['foreign'][1] ]); }  
		flg = 1;
	}

	if (pri.length > 0) { 
		var flg2 = 0;
		sqlstmt += ', PRIMARY KEY (';
		for (var n in pri) { 
			if (flg2 == 1) { sqlstmt += ","; }
			sqlstmt += pri[n];
			flg2 = 1;
		}
		sqlstmt += ')';
	}
	if (foreign.length > 0) { 
		for (var n in foreign) { 
			sqlstmt += ', FOREIGN KEY (' +  foreign[n][0] + ') REFERENCES ' + foreign[n][1] + ' (' + foreign[n][2] +')';
		}
	}

	sqlstmt += " )";
	console.log (sqlstmt);

	this.dbinst.run (sqlstmt);
}

database.prototype.setKeyValue = function (table, keyfield, valfield, items) {
	// save the items to a key/val table
	// items is expected to be a list of key/val items that are to be upserted into the database.
	var sqlstmt;

	sqlstmt = 'INSERT OR REPLACE INTO ' + table + ' (' + keyfield + ', ' + valfield + ') VALUES (?,?)'; 
	var stmt = this.dbinst.prepare (sqlstmt);

	for (var x in items) {
		if (typeof items[x] == "undefined") { items[x] = null; }
		switch (typeof items[x]) { 
			case "boolean":
			case "number": 
			case "string":
				break;
			default: 
				items[x] = JSON.stringify(items[x]);
		}
		stmt.run(x, items[x]);
	}
	stmt.finalize ();
}

database.prototype.getMessages = function (param, callback) { 
	//  param:
	//    { 
	//    	limits: [
	// 			{ field: 'x', operator: '=', value: 45 },
	// 			'and',
	// 			{ field: 'z', operator: '=', value: 45 },
	// 			'or',
	// 			{ field: 'y', operator: '<=', value: 22 },
	// 			... 
	// 		] or Query Class
	//    }
	
	var self = this;
	var where = getWhereClause (param['limits']);
	where = '';
	
	var sqlstmt = 'SELECT id, pluginid, uniqueid, type, timein FROM messages';
	if (where != '') { sqlstmt += ' WHERE ' + where; } 

	this.dbinst.all(sqlstmt, function (err, kv) {
		if (err != null) { 
			console.log ('Err', err);
			new Error (304, "----  error feching rows: " + err);
			callback (null);
		} else {
			var out = {};
			var lim = [];
			for (var x in kv) {
				var m = new Message();
				m.setMessageId(kv[x]['id']);
				m.setPluginId(kv[x]['pluginid']);
				m.setUniqueId(kv[x]['uniqueid']);
				m.setType(kv[x]['type']);
				m.setTimein(kv[x]['timein']);
				if (lim.length > 0) { lim.push ('or'); }
				lim.push ({'field': 'messageid', 'operator': '=', 'value': kv[x]['id']});

				out[kv[x]['id']] = m;
			}

			self.getKeyValues ('messagemeta', [ 'name', 'val', 'messageid' ], lim, function (data) { 
				console.log ('metadata', data);
				for (var n in data) { 
					out[data[n]['messageid']].updateMessageMetaItem (n, data[n]['val']);
				}


				console.log (out);

				callback(out);
			});			
		}
	});
}

database.prototype.getKeyValues = function (table, fields, limits, callback) { 
	// table:  string
	// fields: [ 
	// 		[0] - string - what table field should be used as the key
	// 		[1...] - what values should be placed.
	// 	]   - note - if there are only 0 and 1, it returns standard key/val.  if 3 or more entries, 
	// 		  the array returned is an A-Array of A-Arrays 
	// limits: Associative - list of fields as keys
	// 		[
	// 			{ field: 'x', operator: '=', value: 45 },
	// 			'and',
	// 			{ field: 'z', operator: '=', value: 45 },
	// 			'or',
	// 			{ field: 'y', operator: '<=', value: 22 },
	// 			... 
	// 		]
	
	var x = getWhereClause (limits);
	if (x == undefined) { 
		return undefined;
	}
	var where = x[0];
	var wherevals = x[1];
	if (where == '') { where = ' 1=1 ';}

	var sqlstmt = '';

	for (var n in fields) { 
		if (sqlstmt != '') { sqlstmt += ','; }
		sqlstmt += fields[n];
	}

	sqlstmt = 'SELECT ' + sqlstmt + ' FROM ' + table + ' WHERE ' + where;
	console.log (sqlstmt, wherevals);
	this.dbinst.all(sqlstmt, wherevals, function (err, kv) {
		console.log ('--> ', err, kv);
		if (err != null) { 
			console.log ("----  error feching rows: " + err);
			callback (null);
		} else {
			var out = {};
			for (var x in kv) { 
				var val;
				try { 
					val = JSON.parse (kv[x][fields[1]]);
				} catch (err) { 
					val = kv[x][fields[1]];
				}

				if (fields.length > 2) { 
					val = { val };
					for (var n = 2; n < fields.length; n++) { 
						try { 
							var o = JSON.parse (kv[x][fields[n]]);
							val[fields[n]] = o;
						} catch (err) { 
							val[fields[n]] = kv[x][fields[n]];
						}
					}
				}

				out[kv[x][fields[0]]] = val;
			}
			callback(out);
		}
	});

	return 1;
}


database.prototype.getMessage = function (id, callback) { 

}

function getWhereClause (limits) { 
	var out = '';
	var outvals = [];

	for (var l in limits) {
		if (typeof limits[l] == 'string') { 
			out = out + ' ' + limits[l] + ' ';
		} else { 
			field = limits[l]['field'];
			op = limits[l]['operator'];
			val = limits[l]['value'];

			// Todo...  escape 
			out = out + field + ' ' + op + ' ?';
			outvals.push(val);
		}
	}

	return [out, outvals];
}

database.prototype.updateMessage = function (param, callback) { 
	/* 
		param == { 
			id: 					Message ID or undefined if new message
			type:   				Type of message - these types are registered by plugins
			pluginid: 				Plugin ID of where the message came from
			uniqueid: 				Unique ID of the message - so confirmation can be made its not in the DB 
			time: 					A Date field with the date and time which should be set (undefined == now)

			meta: { }				Name/Value pairs for the message (depends on what type it is)
			content: [
					{ 
						contentid: 		ID for this piece of content
						type: 			Type of content (text,html,attachment)
						content: 		This will depend on the type.  text and html are '' where attachment is {}
					}
				]
			tags: [ 
					{ 
						tagid:   		Id for the tag
						name: 			Name/Value for the tag
					}, 
					...
				]
		}
	*/

	var self = this;

	if (typeof param.time == 'undefined') { 
		param.time = new Date();
	}

	if (typeof param.id == 'undefined') {
		// new message

		// check and see if there are 
		var sqlstmt = 'SELECT id, pluginid, uniqueid, type, timein FROM messages WHERE id=? OR (pluginid=? and uniqueid=?)';
		console.log (sqlstmt, [ param.pluginid, param.uniqueid ]);
		var x = self.dbinst.get (sqlstmt, [ param.pluginid, param.uniqueid ], function (err, row) { 
			if (typeof row != 'undefined') { 
				// found something with the same plugin/uniqueid - no need to create, just update
				param.id = row.id;
				self.updateMessageDetails (param, function (err) { 
					if (err != null) { 
						console.log ('error, failed to update message details', err);
						callback (undefined);
					} else { 
						callback (row.id);
					}
				});
			} else { 
				var sqlstmt = "INSERT INTO messages (pluginid, uniqueid, type, timein) VALUES (?,?,?,?)";
				self.dbinst.run(sqlstmt, param.pluginid, param.uniqueid, param.type, param.time, function (err) { 
					param.id = this.lastID;
					self.updateMessageDetails (param, function (err) { 
						if (err != null) { 
							console.log ('error, failed to update message details', err);
							callback (undefined);
						} else { 
							callback (param.id);
						}
					});
				});
			}
			console.log ('getting', err, row);
		});
	} 



	// var stmt = db.prepare("INSERT INTO user VALUES (?,?)");  
	// for (var i = 0; i < 10; i++) {  

	// var d = new Date();  
	// var n = d.toLocaleTimeString();  
	// stmt.run(i, n);  
	// }  
	// stmt.finalize();  

	// db.each("SELECT id, dt FROM user", function(err, row) {  
	//   console.log("User id : "+row.id, row.dt);  
	// });  
}

database.prototype.updateMessageDetails = function (param, callback) { 
	// This updates the dtails of the message
	// It expects that the message was created already
	// See updateMessage for the param varible's requirements

	// 	meta: { }				Name/Value pairs for the message (depends on what type it is)
			//content: [
			// 		{ 
			// 			type: 			Type of content (text,html,attachment)
			// 			content: 		This will depend on the type.  text and html are '' where attachment is {}
			// 		}
			// 	]
			// tags: [ 
			// 		{ 
			// 			tagid:   		Id for the tag
			// 			name: 			Name/Value for the tag
			// 		}, 
			// 		...
			// 	]
	var self = this;

	if (typeof param.id == 'undefined' || param.id === null) { 
		callback ('id not passed');
	}

	if (typeof param.meta != 'undefined' ) { 
		var stmt = self.dbinst.prepare('INSERT OR REPLACE INTO messagemeta (messageid, name, val) VALUES (?, ?, ?)');
		for (var m in param.meta) {  
			stmt.run(param.id, m, param.meta[m]);  
		}
		stmt.finalize();
	}
	if (typeof param.content != 'undefined' ) { 
		var stmt = self.dbinst.prepare('INSERT OR REPLACE INTO messagecontent (messageid, contenttype, content) VALUES (?, ?, ?)');
		for (var i = 0; i < param.content.length; i++) {  
			stmt.run(param.id, param.content[i].type, param.content[i].content);  
		}
		stmt.finalize();
	}
	if (typeof param.tags != 'undefined' ) { 
		// TODO:
	}


	callback (null);
}

database.prototype.findMessages = function (limits) { 
	/*
		limits:  {
		// query limits
			uniqueid: int - get messages matching the remote unique ID
			pluginid: int - the ID of the plugin
			type: []  - match one or more of the given types

			id:  int  - get the message (with information) identified by this ID
			tags:  []  - match one or more of the given tags
			type: []  - match one or more of the given types
			pagenation: false  - return messages in page lengths
			page:  int  - return for pages only
			pagelength: 10   - return this many items
			where: ---   See the getKeyValues function "limits" - raw query fields

		// outputs limits
			onlycount:  false  - query/return only the count for the message which match
			contenttypes:  []  - only return content types that match
			order: []  - the fields to order the list by
		}
	 */
		
	var sqlstmt;
	var vals = [];

	sqlstmt = "SELECT A.id from messages A WHERE 1=1 ";
	if (typeof limits.pluginid !== 'undefined') {
		sqlstmt += " AND A.pluginid = ?";
		vals.push (limits.pluginid);
	}

	if (typeof limits.uniqueid !== 'undefined') {
		sqlstmt += " AND A.uniqueid = ?";
		vals.push (limits.uniqueid);
	}

	if (typeof limits.type !== 'undefined') { 
		if (typeof limits.type == 'array') {
			var os = '';
			for (t in limits.type) { 
				if (os != '') { os += ' or '; }
				os += " A.type = ? ";
				vals.push (limits.type[t]);
			}
			sqlstmt += "AND (" + os + ")";
		} else { 
			sqlstmt += " AND A.type = ?";
			vals.push (limits.type);
		}
	}

			// messages: id, type, timein
			// messagecontent:  id, messageid, contenttype, content
			// messagemeta: id, messageid, name, val
			// messagetags: tagid, messageid

	var stmt = this.dbinst.prepare (sqlstmt);
	console.log (stmt,vals);
	stmt.run(stmt, vals);

	stmt.finalize ();

}

// SELECT A.id from messages A, messagemeta B WHERE A.id=B.messageid  AND A.pluginid = 24
//  AND A.uniqueid = 'Archive' AND A.type = 'email_folder'




module.exports = database;

