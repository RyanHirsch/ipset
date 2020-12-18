# ipset

Will create or update `internal` and `external` DNS entries in cloudflare.

Expects an environment variable `CF_TOKEN` to be set in order to access the cloudflare API.

## Usage

```sh
node index.js "my-domain.dev" "computer-name"
```

## Cron Usage

see <https://gist.github.com/simov/cdbebe2d65644279db1323042fcf7624>

```cron
*/1 * * * *     (. ~/src/cronjob.env.sh; ~/src/run-ipset.sh >> ~/src/ipset/logs.txt 2>&1)
```

`cronjob.env.sh`

```bash
#!/bin/bash

# NVM needs the ability to modify your current shell session's env vars,
# which is why it's a sourced function

# found in the current user's .bashrc - update [user] below with your user!
export NVM_DIR="/home/pi/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

# uncomment the line below if you need a specific version of node
# other than the one specified as `default` alias in NVM (optional)
# nvm use 4 1> /dev/null
```

`run-ipset.sh`

```bash
#!/bin/bash

# paths can be relative to the current user that owns the crontab configuration

# $(which node) returns the path to the current node version
# either the one specified as `default` alias in NVM or a specific version set above
# executing `nvm use 4 1> /dev/null` here won't work!
# cd into the directory so it will pick up any .env files via dotconfig
cd ~/src/ipset
DEBUG=* $(which node) index.js
```
