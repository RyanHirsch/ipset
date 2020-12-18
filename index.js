require("dotenv").config();
const { execSync } = require("child_process");
const http = require("http");
const cloudflare = require("cloudflare");
const debug = require("debug");

const info = debug("ipset:info");
info.log = console.log.bind(console);

const error = debug("ipset:error");

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

  return httpGet("http://ifconfig.me/ip").then(
    (external) => {
      const localIp = execSync(localIpCommand).toString().trim();
      info(`External IP: ${external.trim()}, Internal IP: ${localIp}`);
      return {
        external: external.trim(),
        internal: localIp,
      };
    },
    (err) => {
      error(`Failed to getIp`, err);
    }
  );
}

async function updateRecord(zoneId, existingDnsRecords, name, ip) {
  const existing = existingDnsRecords.find((r) => r.name === name);

  try {
    if (!existing) {
      info("Creating new record");
      await cf.dnsRecords.add(zoneId, {
        type: "A",
        name: name,
        content: ip,
        ttl: 120,
        proxied: false,
      });
    } else if (existing.content !== ip) {
      info("Updating existing record");
      await cf.dnsRecords.edit(zoneId, existing.id, {
        type: "A",
        name: name,
        content: ip,
        ttl: 120,
        proxied: false,
      });
    }
    info(`Successfully updated ${name}: ${ip}`);
  } catch (err) {
    error(`Failed to update ${name}`, err);
  }
}

async function updateDns(name, hostName, { internal, external }) {
  try {
    const { result: zoneResult } = await cf.zones.browse({ name });
    const { id } = zoneResult[0];

    try {
      const { result: dnsResult } = await cf.dnsRecords.browse(id);

      await updateRecord(id, dnsResult, `${hostName}.internal.${name}`, internal);
      await updateRecord(id, dnsResult, `${hostName}.external.${name}`, external);

      info("Update complete");
    } catch (err) {
      error("Failed to get existing records", err);
    }
  } catch (err) {
    error("Failed to get existing DNS zone", err);
  }
}

const args = process.argv.slice(2);
const host = args[0] || process.env.DNS_HOST;
const computerName = args[1] || process.env.COMPUTER_NAME;

if (host && computerName) {
  info(`Updating ${host} with information for ${computerName}`);
  getIp().then((ips) => updateDns(host, computerName, ips));
} else {
  error("Configure environment variables or use with `node index.js <DOMAIN> <COMPUTER NAME>`");
}
