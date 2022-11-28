// node createApacheConfig.js test.domain.com 8888
// should be called with root privileges

// import fs from "fs";
// import {execSync} from "child_process";
let fs = require("fs");
let {execSync} = require("child_process");


let domain = process.argv[2];
let port = process.argv[3];

if(!domain||!port){
  throw new Error(`Invalid invocation, should be: node createApacheConfig.js $DOMAIN $PORT`)
}

let httpName = `${domain}.conf`
let httpsName = `${domain}-le-ssl.conf`
let httpData = `<VirtualHost *:80>
        ServerName ${domain}

        RewriteEngine on
        RewriteCond %{SERVER_NAME} =${domain}
        RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
`
let httpsData = `<IfModule mod_ssl.c>
<VirtualHost *:443>
        ServerName ${domain}

        RewriteEngine on
        ProxyPass / http://localhost:${port}/
        ProxyPassReverse / http://localhost:${port}/

</VirtualHost>
</IfModule>
`

save(httpName, httpData)
save(httpsName, httpsData)

reload(domain)

function save(name, data) {
  let path = '/etc/apache2/sites-available/' + name
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, data)
  }
}

function reload (domain) {
    execSync(`a2ensite ${domain}`)
    execSync(`service apache2 reload`)
}
