const baileys = require("@whiskeysockets/baileys");
const axios = require("axios");
const fs = require("fs");
const P = require("pino");
const NodeCache = require("node-cache");

let msgRetryCounterCache = new NodeCache();
let owner = ["6282138588935@s.whatsapp.net"];

require("./node_modules/@whiskeysockets/baileys/lib/Utils/generics.js").generateMessageID = () => {
  return require("crypto").randomBytes(14).toString("hex").toUpperCase() + "-DX";
};

const main = async (auth) => {
  let { state, saveCreds } = await baileys.useMultiFileAuthState(auth);
  let sock = baileys.default({
    auth: state,
    markOnlineOnConnect: false,
    logger: P({ level: "silent" }),
    browser: ["Linux", "Chrome", ""],
    printQRInTerminal: false,
  });
  
  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    await sock.waitForConnectionUpdate((update) => update.qr);
    let phoneNumber = "6283893964069";
    let code = await sock.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`Your Pairing Code: ${code}`);
  }

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "close") {
      let code = update.lastDisconnect?.error?.output?.statusCode;
      if (code !== 401) main(auth);
    }
  });

  sock.ev.on("messages.upsert", async (message) => {
    try {
      if (!message.messages[0]) return;
      let msg = message.messages[0];
      let type = baileys.getContentType(msg.message) || null;
      let body = msg.message?.conversation ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.templateButtonReplyMessage?.selectedId ||
        "";
      let args = body.trim().split(/ +/).slice(1);
      let from = msg.key.remoteJid;
      let sender = from.endsWith("@g.us") ? msg.key.participant : from;
      let isOwner = owner.includes(sender);
      let prefix = /^[./#]/i.test(m.body) ? body.match(/^[./#]/i)[0] : "";
      let command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
      
      let cmd = command;
      let p = prefix;
      
      if (msg.key.id.startsWith("BAE5")) return;
      if (command) return console.log(`[ MESSAGE ] from ${m.message.pushName} text: ${body}`);
      if (from === "status@broadcast") return sock.readMessages([m.key]);
      
      //command
      if (cmd == p + "tes") {
        sock.sendMessage(from, { text: "Active" }, { quoted: msg })
      }
      if (cmd == p + "ping") {
        return;
      }
      
    } catch (e) {
      console.log(e)
    }
  })
}

//start
main("session").then(() => console.log("Running..."));
