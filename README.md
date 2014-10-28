node-red-contrib-ldap
=====================

Basic LDAP search node

Takes base DN and filter

Filter is a Mustache (http://mustache.github.io/) template that will match against the whole msg object

Bind is available

TLS seams to crash node so disabled for now

Depends on the LDAP npm module which uses the openldap libraries. Install with:

ubuntu/debian:
apt-get install libldap-dev

fedora:
yum install openldap-devel

then:

npm install LDAP

Only tested on Linux so far

Example flow using the forumsys.com public test ldap (http://www.forumsys.com/tutorials/integration-how-to/ldap/online-ldap-test-server/) 
```
[{"id":"fb0e4.fff04f1c","type":"ldap","server":"ldap.forumsys.com","port":"389"},{"id":"c9a5fbe9.365a08","type":"debug","name":"","active":true,"console":"false","complete":"false","x":551,"y":373,"z":"9f919f80.606e6","wires":[]},{"id":"6f998816.906678","type":"inject","name":"","topic":"","payload":"gauss","payloadType":"string","repeat":"","crontab":"","once":false,"x":197,"y":371,"z":"9f919f80.606e6","wires":[["f032bf20.0fcd4"]]},{"id":"f032bf20.0fcd4","type":"ldap out","name":"","topic":"","base":"dc=example,dc=com","filter":"uid={{payload}}","server":"fb0e4.fff04f1c","x":386,"y":359,"z":"9f919f80.606e6","wires":[["c9a5fbe9.365a08"]]}]
```
