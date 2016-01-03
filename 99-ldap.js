// Copyright 2013,2014 IBM Corp.

//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at

//   http://www.apache.org/licenses/LICENSE-2.0

//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

module.exports = function(RED) {
	"use strict";
	var LDAP = require("ldapjs")
	var mustache = require("mustache");
	// var util = require("util");

	var connection;

	function ldapNode(n) {
		RED.nodes.createNode(this,n);

		this.server = n.server;
		this.port = n.port;
		this.tls = n.tls;
		if (this.credentials) {
            this.binddn = this.credentials.binddn;
            this.password = this.credentials.password;
        }
	}

	RED.nodes.registerType("ldap",ldapNode,{
        credentials: {
            binddn: {type:"text"},
            password: {type: "password"}
        }
    });

	function LDAPOutNode(n) {
		RED.nodes.createNode(this,n);
		this.server = n.server;
		this.base = n.base;
		this.filter = n.filter;
		this.topic = n.topic;
		this.ldapServer = RED.nodes.getNode(this.server);
		var credentials = RED.nodes.getCredentials(this.server);
		if (this.ldapServer) {
			this.status({fill:"red",shape:"ring",text:"disconnected"});
			var ldapOptions = {
				url:'ldap://' + this.ldapServer.server,
				ConnectTimeout: 1000

			};
			if (this.ldapServer.tls) {
				ldapOptions.url = "ldaps" + ldapOptions.substring(4);
				if (this.ldapServer.port !== 636) {
					ldapOptions.url = ldapOptions.url + ":" + this.ldapServer.port;
				}
			} else {
				if (this.ldapServer.port !== 389) {
					ldapOptions.url = ldapOptions.url + ":" + this.ldapServer.port;
				}
			}

			this.ldap = LDAP.createClient(ldapOptions);
			var node = this
			this.status({fill:"red",shape:"ring",text:"disconnected"});
			if (credentials && credentials.binddn && credentials.password) {
				node.ldap.bind(credentials.binddn, credentials.password,function(err){
					if (err) {
						node.error("failed to bind - " + err);
					} else {
						node.status({fill:"green",shape:"dot",text:"bound"});
						node.connected = true;
					}
				});
			} else {
				node.status({fill:"green",shape:"dot",text:"bound"});
				node.connected = true;
			}

			this.on('input', function(msg){
				if (node.connected) {

					var options = {
						filter: mustache.render(node.filter,msg),
						scope: 'sub'
						//attributes: []
					};
					node.ldap.search(node.base, options, function(err,res){

						if (err) {
							console.log(err);
						}

						var data = [];

						res.on('searchEntry', function(entry){
							data.push(entry.object);
						});

						res.on('error', function(error){
							node.error("search error");
						});

						res.on('end', function(){
							if (node.topic) {
								msg.topic = node.topic;
							}
							msg.payload = data;
							node.send(msg);
						});
					});
				} else {
					node.error("not connected");
				}
			});
			this.on('close',function() {
				if(node.ldap) {
					node.ldap.unbind();
				}
			});
		}
	}

	RED.nodes.registerType("ldap out",LDAPOutNode);
}