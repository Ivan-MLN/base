const baileys = require("@whiskeysockets/baileys");
const moment = require("moment-timezone");
const syntaxerror = require("syntax-error");
const util = require("util");
const axios = require("axios");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fileType = import("file-type");
const fs = require("fs");
const cp = require("child_process");
const P = require("pino");
const NodeCache = require("node-cache")
const msgRetryCounterCache = new NodeCache()

global.owner = ["6282138588935@s.whatsapp.net"]

require("./node_modules/@whiskeysockets/baileys/lib/Utils/generics.js").generateMessageID = () => {
    return require('crypto').randomBytes(14).toString('hex').toUpperCase() + '-DX'
}
const main = async (auth) => {
  const { state, saveCreds } = await baileys.useMultiFileAuthState(auth);
  const sock = baileys.default({
    auth: state,
    markOnlineOnConnect: false,
    logger: P({
      level: "silent",
    }),
    browser: ["Linux", "Chrome", ""],
    printQRInTerminal: false
  });
  bindSock(sock);
  sock.ev.on("creds.update", saveCreds);
  if (!sock.authState.creds.registered) {
    await sock.waitForConnectionUpdate((update) => update.qr)
    let phoneNumber = "6283893964069"
    let code = await sock.requestPairingCode(phoneNumber)
    code = code?.match(/.{1,4}/g)?.join("-") || code
    console.log(`Your Pairing Code: ${code}`)
}
  sock.ev.on("connection.update", (update) => {
    if (update.connection == "close") {
      const code = update.lastDisconnect?.error?.output?.statusCode;
      if (code != 401) main(auth);
    }
  });
  sock.ev.on("messages.upsert", async (message) => {
    try {
      if (!message.messages[0]) return;
      let msg = message.messages[0];
      let m = new Message(msg, sock, {});
      let type = baileys.getContentType(msg.message)
        ? baileys.getContentType(msg.message)
        : null;
      let body =
        msg.message?.conversation ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.templateButtonReplyMessage?.selectedId ||
        "";
      let args = body.trim().split(/ +/).slice(1);
      let from = msg.key.remoteJid;
      let q = args.join(" ");
      let isOwner = owner.includes(m.sender)
      let isGroup = from.endsWith("@g.us") ? true : false;
      let prefix = /^[°•π÷×¶∆£¢€¥®️™️+✓_=|/~!?@#%^&.©️^]/i.test(m.body) ? body.match(/^[°•π÷×¶∆£¢€¥®️™️+✓_=|/~!?@#%^&.©️^]/i)[0] : ""
      let command = body
        .slice(prefix.length)
        .trim()
        .split(/ +/)
        .shift()
        .toLowerCase();
      let isCmd = command.startsWith(prefix);
      if (msg.key.id.startsWith("BAE5")) return;
      if (command) return console.log(`[ MESSAGE ] from ${m.message.pushName} text: ${body}`)
      if (from == "status@broadcast") return sock.readMessages([m.key])
      switch (command) {
        case ">":
        case "=>":
          if (!m.isOwner) return;
          var arg =
            command == ">" ? args.join(" ") : "return " + args.join(" ");
          try {
            var text = util.format(await eval(`(async()=>{ ${arg} })()`));
            sock.sendMessage(from, { text }, { quoted: msg });
          } catch (e) {
            let _syntax = "";
            let _err = util.format(e);
            let err = syntaxerror(arg, "EvalError", {
              allowReturnOutsideFunction: true,
              allowAwaitOutsideFunction: true,
              sourceType: "module",
            });
            if (err) _syntax = err + "\n\n";
            sock.sendMessage(
              from,
              { text: util.format(_syntax + _err) },
              { quoted: msg }
            );
          }
        case "$":
          if (!m.isOwner) return;
          try {
            cp.exec(args.join(" "), function (er, st) {
              if (er)
                sock.sendMessage(
                  from,
                  {
                    text:
                      "```" +
                      util.format(
                        er
                          .toString()
                          .replace(
                            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
                            ""
                          )
                      ) +
                      "```",
                  },
                  {
                    quoted: msg,
                  }
                );
              if (st)
                sock.sendMessage(
                  from,
                  {
                    text:
                      "```" +
                      util.format(
                        st
                          .trim()
                          .toString()
                          .replace(
                            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
                            ""
                          )
                      ) +
                      "```",
                  },
                  {
                    quoted: msg,
                  }
                );
            });
          } catch (e) {
            console.warn(e);
          }
          break;
        default:
      }
    } catch (e) {
      console.log(e);
    }
  });
};
main("session").then((p) =>
  console.log("Running...")
);

// function apa aja
function bindSock(sock) {
  Object.defineProperties(sock, {
    sendText: {
      async value(jid, text, options) {
        await sock.presenceSubscribe(jid)
		await baileys.delay(500)
		await sock.sendPresenceUpdate('composing', jid)
		await baileys.delay(2000)
		await sock.sendPresenceUpdate('paused', jid)
        
        return sock.sendMessage(
          jid,
          {
            text,
            ...options,
          },
          {
            ...options,
          }
        );
      },
    },
    reply: {
      async value(jid, text, quoted, options) {
    await baileys.delay(500)
		await sock.sendPresenceUpdate('composing', jid)
		await baileys.delay(2000)
		await sock.sendPresenceUpdate('paused', jid)
        return sock.sendMessage(
          jid,
          {
            text,
            ...options,
          },
          {
            quoted,
            ...options,
          }
        );
      },
    },
    getFile: {
      async value(media) {
        let data = Buffer.isBuffer(media)
          ? media
          : isUrl(media)
          ? await (await fetch(media)).buffer()
          : fs.existsSync(media)
          ? fs.readFileSync(media)
          : /^data:.*?\/.*?;base64,/i.test(media)
          ? Buffer.from(media.split(",")[1])
          : null;
        if (!data) return new Error("Result is not a buffer");
        let type = (await (await fileType).fileTypeFromBuffer(data)) || {
          mime: "application/octet-stream",
          ext: ".bin",
        };
        return {
          data,
          ...type,
        };
      },
    },
    sendFile: {
      async value(jid, media, options = {}) {
        let file = await sock.getFile(media);
        let mime = file.ext,
          type;
        if (mime == "mp3") {
          type = "audio";
          options.mimetype = "audio/mpeg";
          options.ptt = options.ptt || false;
        } else if (mime == "jpg" || mime == "jpeg" || mime == "png")
          type = "image";
        else if (mime == "webp") type = "sticker";
        else if (mime == "mp4") type = "video";
        else type = "document";
        return sock.sendMessage(
          jid,
          {
            [type]: file.data,
            ...options,
          },
          {
            ...options,
          }
        );
      },
    },
    fetchData: {
      async value(url, options = {}) {
        try {
          var { data } = await axios({
            url,
            ...options,
          });
          return data;
        } catch (e) {
          return e.response;
        }
      },
    },
    fetchBuffer: {
      async value(url) {
        try {
          var req = await fetch(url);
          return await req.buffer();
        } catch (e) {
          return e;
        }
      },
    },
  });
}
function Message(msg, sock, store) {
  if (!msg?.message) return;
  let type = baileys.getContentType(msg.message)
    ? baileys.getContentType(msg.message)
    : Object.keys(msg.message)[0];
  this.key = msg.key;
  this.from = this.key.remoteJid;
  this.chat = this.from;
  this.fromMe = this.key.fromMe;
  this.id = this.key.id;
  this.isGroup = this.from.endsWith("@g.us");
  this.me =
    sock.type == "md"
      ? sock.user.id.split(":")[0] + baileys.S_WHATSAPP_NET
      : sock.state.legacy.user.id;
  this.sender = this.fromMe
    ? this.me
    : this.isGroup
    ? msg.key.participant
    : this.from;
  if (type == "conversation" || type == "extendedTextMessage")
    this.text = msg.message?.conversation || msg.message?.extendedTextMessage;
  this.type = type;
  this.isOwner = !!owner.find((v) => v == this.sender);
  this.isBaileys = this.id.startsWith("BAE5") && this.id.length == 16;
  this.time = moment.tz("Asia/Jakarta").format("HH:mm");
  this.pushname = msg.pushName;
  this.messageTimestamp = msg.messageTimestamp;
  this.message = msg;
  if (this.message.message[type]?.contextInfo?.quotedMessage)
    this.quoted = new QuotedMessage(this, sock, store);
}
Message.prototype.toJSON = function () {
  let str = JSON.stringify({
    ...this,
  });
  return JSON.parse(str);
};
Message.prototype.download = function () {
  return (async ({ message, type }) => {
    if (type == "conversation" || type == "extendedTextMessage")
      return undefined;
    let stream = await baileys.downloadContentFromMessage(
      message.message[type],
      type.split("M")[0]
    );
    return await streamToBuff(stream);
  })(this);
};

function QuotedMessage(msg, sock, store) {
  let contextInfo = msg.message.message[msg.type].contextInfo;
  let type = baileys.getContentType(contextInfo.quotedMessage)
    ? baileys.getContentType(contextInfo.quotedMessage)
    : Object.keys(contextInfo.quotedMessage)[0];
  this.key = {
    remoteJid: msg.from,
    fromMe: contextInfo.participant == msg.me,
    id: contextInfo.stanzaId,
    participant: contextInfo.participant,
  };
  this.id = this.key.id;
  this.sender = this.key.participant;
  this.fromMe = this.key.fromMe;
  this.mentionedJid = contextInfo.mentionedJid;
  if (type == "conversation" || type == "extendedTextMessage")
    this.text =
      contextInfo.quotedMessage?.conversation ||
      contextInfo.quotedMessage?.extendedTextMessage;
  this.type = type;
  this.isOwner = !!owner.find((v) => v == this.sender);
  this.isBaileys = this.id.startsWith("BAE5") && this.id.length == 16;
  this.message = contextInfo.quotedMessage;
}

QuotedMessage.prototype.toJSON = function () {
  let str = JSON.stringify({
    ...this,
  });
  return JSON.parse(str);
};

QuotedMessage.prototype.download = function () {
  return (async ({ message, type }) => {
    if (type == "conversation" || type == "extendedTextMessage")
      return undefined;
    let stream = await baileys.downloadContentFromMessage(
      message[type],
      type.split("M")[0]
    );
    return await streamToBuff(stream);
  })(this);
};

function isUrl(url) {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi.test(
    url
  );
}
async function streamToBuff(stream) {
  let buff = Buffer.alloc(0);
  for await (const chunk of stream) buff = Buffer.concat([buff, chunk]);
  return buff;
}

//web
const express = require("express")
const app = express()

app.get("/", (req, res) => {
	res.send("kontol")
})
cp.execSync("mkdir .tmp")
app.listen(process.env.PORT || 5000)
