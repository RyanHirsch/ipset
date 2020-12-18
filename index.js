require("dotenv").config();
const { execSync } = require("child_process");
const http = require("http");
const cloudflare = require("cloudflare");

const cf = cloudflare({
  token: process.env.CF_TOKEN,
});

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

function getIp() {
  const localIpCommand = process.platform === "darwin" ? "ipconfig getifaddr en0" : "hostname -I";

  return httpGet("http://ifconfig.me/ip").then((external) => {
    const localIp = execSync(localIpCommand).toString().trim();
    return {
      external: external.trim(),
      internal: localIp,
    };
  }, console.error);
}

async function updateRecord(zoneId, existingDnsRecords, name, ip) {
  const existing = existingDnsRecords.find((r) => r.name === name);

  try {
    if (!existing) {
      await cf.dnsRecords.add(zoneId, {
        type: "A",
        name: name,
        content: ip,
        ttl: 120,
        proxied: false,
      });
    } else if (existing.content !== ip) {
      await cf.dnsRecords.edit(zoneId, existing.id, {
        type: "A",
        name: name,
        content: ip,
        ttl: 120,
        proxied: false,
      });
    }
  } catch (err) {
    console.error(`Failed to update ${name}`);
    console.error(err);
  }
}

async function updateDns(name, hostName, { internal, external }) {
  const { result: zoneResult } = await cf.zones.browse({ name });
  const { id } = zoneResult[0];

  const { result: dnsResult } = await cf.dnsRecords.browse(id);

  await updateRecord(id, dnsResult, `${hostName}.internal.${name}`, internal);
  await updateRecord(id, dnsResult, `${hostName}.external.${name}`, external);
}

const args = process.argv.slice(2);
const [host, computerName] = args;

console.log({ host, computerName });

if (host && computerName && args.length === 2) {
  getIp().then((ips) => updateDns(host, computerName, ips));
}
