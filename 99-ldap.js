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
	const LDAP = require("ldapjs");
	const mustache = require("mustache");
	const fs = require('fs');
	// const util = require("util");
	// let connection;

	function ldapNode(config) {
		RED.nodes.createNode(this,config);

		this.server = config.server;
		this.port = config.port;
		this.tls = config.tls;
		this.tlsCert = config.tlsCert;
		this.tlsConf = config.tlsConfig;
		this.tlsConfig = RED.nodes.getNode(this.tlsConf);
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

	function LDAPOutNode(config) {
		RED.nodes.createNode(this,config);
		this.server = config.server;
		this.base = config.base;
		this.filter = config.filter;
		this.topic = config.topic;
		this.ldapServer = RED.nodes.getNode(this.server);
		let credentials = RED.nodes.getCredentials(this.server);
		let node = this;

		if (node.ldapServer) {
			node.status({fill:"red",shape:"ring",text:"disconnected"});
			const ldapOptions = {
				url:'ldap://' + node.ldapServer.server,
				ConnectTimeout: 1000
			};

			if (node.ldapServer.tls) {
				ldapOptions.url = "ldaps://" + node.ldapServer.server;	

				if (node.ldapServer.tlsConf) {

					ldapOptions.tlsOptions = {};
					node.ldapServer.tlsConfig.addTLSOptions(ldapOptions.tlsOptions);

				} else if (typeof node.ldapServer.tlsCert === 'string' && node.ldapServer.tlsCert) {
					ldapOptions.tlsOptions = {
						ca: [fs.readFileSync(node.ldapServer.tlsCert)]
					};
				}

				if (node.ldapServer.port !== 636) {
					ldapOptions.url = ldapOptions.url + ":" + node.ldapServer.port;
				}

			} else {
				if (node.ldapServer.port !== 389) {
					ldapOptions.url = ldapOptions.url + ":" + node.ldapServer.port;
				}
			}

			node.ldapOptions = ldapOptions;

			connect(node, credentials);

			node.on('input', function(msg){
				if (node.connected) {

					const options = {
						filter: mustache.render(node.filter,msg),
						scope: 'sub'
						//attributes: []
					};
					node.ldap.search(node.base, options, function(err,res){

						if (err) {
							console.log(err);
						}

						let data = [];

						res.on('searchEntry', function(entry){
							data.push(entry.object);
						});

						res.on('error', function(error){
							node.error("ldap search error:", error);
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
			node.on('close',function() {
				if (node.reconnectTimer) {
					clearTimeout(node.reconnectTimer);
				}
				if(node.ldap) {
					try {
					node.ldap.unbind();
					} catch (exp) {
						
					}
				}
			});
		}
	}

	function connect(node, credentials) {
		node.ldap = LDAP.createClient(node.ldapOptions);

		node.status({fill:"red",shape:"ring",text:"disconnected"});
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

		node.ldap.on('error',function(err){
			node.log("LDAP Connection Error: " + err);
			//node.ldap.unbind();
			node.status({fill:"red",shape:"ring",text:"disconnected"});
			node.reconnectTimer = setTimeout(function(){
				node.reconnectTimer = undefined;
				connect(node, credentials);
			},2000);

		});
	}

	RED.nodes.registerType("ldap out",LDAPOutNode);
};
