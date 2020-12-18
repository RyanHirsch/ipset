# ipset

Will create or update `internal` and `external` DNS entries in cloudflare.

Expects an environment variable `CF_TOKEN` to be set in order to access the cloudflare API.

## Usage

```sh
node index.js "my-domain.dev" "computer-name"
```
