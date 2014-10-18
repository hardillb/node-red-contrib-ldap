module.exports = function(RED) {
	"use strict";
	var LDAP = require("LDAP");
	var mustache = require("mustache");

	var connection;

	function ldapNode(n) {
		RED.nodes.createNode(this,n);

		this.server = n.server;
		this.port = n.port;
		if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }
	}

	RED.nodes.registerType("ldap",ldapNode,{
        credentials: {
            user: {type:"text"},
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
		if (this.ldapServer) {
			this.status({fill:"red",shape:"ring",text:"disconnected"});
			this.ldap = new LDAP({
				uri:'ldap://' + this.ldapServer.server,
				version: 3,
				starttls: false,
				connectiontimeout: 1,
				reconnect: true

			});
			var node = this
			this.ldap.open(function(err){
				if (err) {
					console.log(err);
					return;
				}
				node.status({fill:"green",shape:"ring",text:"connected"});
			});
			this.on('input', function(msg){
				var options = {
					base: node.base,
					scope: '',
					filter: mustache.render(node.filter,msg),
					attrs: ''
				};
				node.ldap.search(options, function(err,data){
					if (node.topic) {
						msg.topic = node.topic;
					}

					msg.payload = data;
					node.send(msg);
				});
			});
			this.on('close',function() {
				if(node.ldap) {
					node.ldap.close();
				}
			});
		}
	}

	RED.nodes.registerType("ldap out",LDAPOutNode);
}