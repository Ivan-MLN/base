const baileys = require("@whiskeysockets/baileys");
const moment = require("moment-timezone");
const syntaxerror = require("syntax-error");
const util = require("util");
const axios = require("axios");
const { chromium } = require("playwright-core");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fileType = import("file-type");
const fs = require("fs");
const cp = require("child_process");
const FormData = require("form-data");
const qs = require("qs")
const vm = require("vm");
const P = require("pino");
const crypto = require("crypto");
const webp = require("node-webpmux");
const path = require("path");
const ff = require("fluent-ffmpeg");
const cheerio = require("cheerio");
const express = require("express");
const readline = require("readline");
const NodeCache = require("node-cache")
const msgRetryCounterCache = new NodeCache()

global.owner = ["6282138588935@s.whatsapp.net","6281615901727@s.whatsapp.net","6283169480682@s.whatsapp.net"];
global.curhat = {};
global.chatgpt = {};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const pairingCode = false 

require("./node_modules/@whiskeysockets/baileys/lib/Utils/generics.js").generateMessageID = () => {
    return require('crypto').randomBytes(14).toString('hex').toUpperCase() + '-FRM'
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
    let phoneNumber = "62881082925549"
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
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
      
//        if (!isOwner) return 
      
//    if (!msg.key.fromMe) return
      if (command) {
        console.log(`[ MESSAGE ] from ${m.message.pushName} text: ${body}`);
      }
if (from == "status@broadcast") return sock.readMessages([m.key])
      //Curhat-GPT
      if (curhat[m.sender]) {
        if (body == ".curhatgpt end") {
          sock.reply(chatgpt[m.sender].from, "Anda telah mengakhiri sesi curhat!", msg)
            delete curhat [m.sender]

        }
        clearTimeout(curhat[m.sender].sessionTimeout);
        if (!isGroup && !isCmd) {
          curhat[m.sender].question.push("User: " + body);
          var ai = await quest(curhat[m.sender].question.join("\n\n"));
          curhat[m.sender].question.push(ai);
          sock.reply(curhat[m.sender].from, ai.replace(/AI:/, "").trim(), msg);
        }
        if (isGroup && m.quoted && m.quoted.id.endsWith("-CGPT")) {
          curhat[m.sender].question.push("User: " + body);
          var ai = await quest(curhat[m.sender].question.join("\n\n"));
          curhat[m.sender].question.push(ai);
          sock.reply(curhat[m.sender].from, ai.replace(/AI:/, "").trim(), msg, {
            messageId:
              crypto.randomBytes(14).toString("hex").toUpperCase() + "-CGPT",
          });
        }
        curhat[m.sender].sessionTimeout = setTimeout(() => {
          sock.reply(
            chatgpt[m.sender].from,
            "Anda telah meninggalkan chat selama 5 menit, sesi akan diakhiri!",
            msg
          );
          delete curhat[m.sender];
        }, 5 * 60 * 1000);
      }
      //Chat-GPT
      if (chatgpt[m.sender]) {
        if (body == ".justgpt end") {
          sock.reply(chatgpt[m.sender].from, "Anda telah mengakhiri sesi chatgpt!", msg)
            delete chatgpt[m.sender]

        }
        clearTimeout(chatgpt[m.sender].sessionTimeout);
        if (!isGroup && !isCmd) {
          chatgpt[m.sender].question.push("User: " + body);
          var ai = await quest(chatgpt[m.sender].question.join("\n\n"));
          chatgpt[m.sender].question.push(ai);
          sock.reply(chatgpt[m.sender].from, ai.replace(/AI:/, "").trim(), msg);
        }
        if (isGroup && m.quoted && m.quoted.id.endsWith("-GPT")) {
          chatgpt[m.sender].question.push("User: " + body);
          var ai = await quest(chatgpt[m.sender].question.join("\n\n"));
          chatgpt[m.sender].question.push(ai);
          sock.reply(chatgpt[m.sender].from, ai.replace(/AI:/, "").trim(), msg, {
            messageId:
              crypto.randomBytes(14).toString("hex").toUpperCase() + "-GPT",
          });
        }
        chatgpt[m.sender].sessionTimeout = setTimeout(() => {
          sock.reply(
            chatgpt[m.sender].from,
            "Anda telah meninggalkan chat selama 5 menit, sesi akan diakhiri!",
            msg
          );
          delete chatgpt[m.sender];
        }, 5 * 60 * 1000);
      }
      switch (command) {
                case "tes": 
return;
break
case "tourl":
sock.reply(from, await upload(await m.quoted.download()), msg)
break
case "addown": 
owner.push(m.quoted.sender)
sock.reply(from, "ok", msg) 
break
case "curhatgpt":
          if (curhat[m.sender] && body.endsWith("end")) {
            sock.reply(from, "Anda telah mengakhiri sesi curhat!", msg)
            delete curhat [m.sender]
            return;
          }
          if (body.endsWith("start")) {
          curhat[m.sender] = {
            question: [
              "AI: Now change the way you speak to be a friend who always accepts someone's comments, and you will become a good friend to confide in.",
              "User: jawablah mnggunakan bahasa Indonesia!",
              "AI: Baik",
            ],
            from
          };
          if (isGroup) {
            sock.sendText(
              from,
              "Sesi curhat telah dimulai! bercerita lah dengan membalas atau reply pesan bot.",
              {
                quoted: msg,
                messageId:
                  crypto.randomBytes(14).toString("hex").toUpperCase() +
                  "-CGPT",
              }
            );
          } else {
            sock.sendText(
              from,
              "Sesi curhat telah dimulai, silahkan ceritakan keluh kesan mu.",
              { quoted: msg }
            );
          }
          curhat[m.sender].sessionTimeout = setTimeout(() => {
            sock.reply(
              from,
              "Anda telah meninggalkan chat selama 5 menit, sesi akan diakhiri!",
              msg
            );
            delete curhat[m.sender];
          }, 5 * 60 * 1000);
          } else {
            sock.sendText(
              from,
              `Hallo @${m.sender.split("@")[0]} 👋🏻, jika anda ingin memulai sesi chatgpt silahkan memilih opsi dibawah ini

*.curhatgpt start* (memulai sesi)
*.curhatgpt end* (akhiri sesi)`,
              { quoted: msg, mentions: [m.sender] }
            );
          }

          break;
        case "justgpt":
        case "chatbot":
          if (chatgpt[m.sender] && body.endsWith("end")) {
            sock.reply(from, "Anda telah mengakhiri sesi chatgpt!", msg)
            delete chatgpt[m.sender]
            return;
          }
          if (body.endsWith("start")) {
          chatgpt[m.sender] = {
            question: [
              "AI: I am Just-GPT created by my creator OnlyVan.Ai. I am ready to answer all your questions!",
              "User: jawablah mnggunakan bahasa Indonesia!",
              "AI: Baik",
            ],
            from
          };
          if (isGroup) {
            var satu = await sock.sendText(
              from,
              "Sesi chatbot telah dimulai! bertanya lah dengan membalas atau reply pesan bot.",
              {
                quoted: msg,
                messageId:
                  crypto.randomBytes(14).toString("hex").toUpperCase() + "-GPT",
              }
            );
          } else {
            sock.sendText(
              from,
              "Sesi chatgpt telah dimulai, silahkan bertanya.",
              { quoted: msg }
            );
          }
          chatgpt[m.sender].sessionTimeout = setTimeout(() => {
            sock.reply(
              from,
              "Anda telah meninggalkan chat selama 5 menit, sesi akan diakhiri!",
              msg
            );
            delete chatgpt[m.sender];
          }, 5 * 60 * 1000);
          } else {
            sock.sendText(
              from,
              `Hallo @${m.sender.split("@")[0]} 👋🏻, jika anda ingin memulai sesi chatgpt silahkan memilih opsi dibawah ini

*.justgpt start* (memulai sesi)
*.justgpt end* (akhiri sesi)`,
              { quoted: msg, mentions: [m.sender] }
            );
          }
          break;
        case "menu":
          var more = String.fromCharCode(8206).repeat(4001);
          var txt = `Hallo @${m.sender.split("@")[0]} 👋🏻
Berikut menu bot yang tersedia..

.cc (unduh video capcut)
.tt (unduh video tiktok)
.st (membuat sticker)
.tourl (upload vid/fto/aud)
.audio (aud filter)
.toimg (mengkonversi sticker menjadi gambar)
.tomp3 (mengekstrak audio pada sebuah video)`;
          sock.reply(from, txt, msg, { mentions: [m.sender] });
          break;
        case "tomp3":
          if (!m.quoted) return sock.sendFile(
              from, 
              "https://telegra.ph/file/5759af1bc619d3257bc69.jpg", { caption: "mohon reply video yang ingin anda jadikan audio", quoted: msg })
            
          sock.sendFile(from, await toAudio(await m.quoted.download()), {
            quoted: msg,
          });
          break;
        case "toimg":
          if (!m.quoted)return sock.sendFile(
          from, 
          "https://telegra.ph/file/519e42af40b3cb34b3878.jpg", { caption: "mohon reply sticker yang ingin anda jadikan foto", quoted: msg })

          sock.sendFile(from, await toImage(await m.quoted.download()), {
            quoted: msg,
          });
          break;
        case "shorturl":
          sock.reply(
            from,
            await sock.fetchData("https://tinyurl.com/api-create.php?url=" + q),
            msg
          );
          break;
        case "capcut":
        case "cc":
          var { originalVideoUrl } = await capcutdl(q);
          var url = "https://ssscap.net" + originalVideoUrl;
          var satu = await sock.sendFile(from, url, { quoted: msg });
          sock.sendFile(from, await toAudio(await sock.fetchBuffer(url)), {
            quoted: satu,
          });
          break;
        case "tiktok":
        case "tt":
          case "ttmp3":
          var { result } = await sock.fetchData(
            "https://api.tiklydown.eu.org/api/download/v2?url=" + q
          );
          if (/ttmp3/.test(body)) return sock.sendFile(
            from,
            await toAudio(await sock.fetchBuffer(result.video_hd)),
            { quoted: msg }
          );
          var satu = await sock.sendFile(from, result.video_hd, {
            quoted: msg,
          });
          sock.sendFile(
            from,
            await toAudio(await sock.fetchBuffer(result.video_hd)),
            { quoted: satu }
          );
          break;
        case ".ping": case "tes":
          await sock.reply(from, "Active!", msg);
          break;
        case "rv":
        case "readvo":
        case "vv":
          if (!msg.message[type]?.contextInfo?.quotedMessage) return;
          var tipeQuot = Object.keys(
            msg.message[type].contextInfo.quotedMessage
          )[0];
          if (tipeQuot == "viewOnceMessageV2") {
            var anu =
              msg.message.extendedTextMessage.contextInfo.quotedMessage
                .viewOnceMessageV2.message;
            var tipe = Object.keys(anu)[0];
            delete anu[tipe].viewOnce;
            var ah = {};
            if (anu[tipe].caption) ah.caption = anu[tipe].caption;
            if (anu[tipe]?.contextInfo?.mentionedJid) {
              ah.contextInfo = {};
              ah.contextInfo.mentionedJid =
                anu[tipe]?.contextInfo?.mentionedJid || [];
            }
            var dta = await baileys.downloadContentFromMessage(
              anu[tipe],
              tipe.split("M")[0]
            );
            sock.sendMessage(
              m.sender,
              {
                [tipe.split("M")[0]]: await streamToBuff(dta),
                ...ah,
              },
              {
                quoted: msg,
              }
            );
          }
          if (tipeQuot == "documentMessage") {
            var text = (await m.quoted.download()).toString();
            if (text.length >= 65000) text.slice(65000);
            sock.reply(m.from, text, msg);
          }
          // sock.reply(m.from, "media telah di kirim ke pribadi chat!", msg)
          break;
        case "sox":
        case "audio":
          if (!q) return sock.reply(from, "Input type and number!", msg);

          var anj = await AUDIO.create(await m.quoted.download(), {
            [args[0]]: args[1],
          });
          if (!anj.includes("mp3")) {
            anj = wavToMp3(anj);
          }
          sock.sendFile(from, anj, {
            mimetype: "audio/mpeg",
            ptt: true,
            quoted: msg,
          });
          break;
        case "stk":
    //    case "swm":
  //      case "stiker":
//        case "sticker":
          if (!m.quoted) return sock.sendFile(
              from, 
              "https://telegra.ph/file/2e9f7b2279f870aba4bf1.jpg", { caption: "mohon reply foto yang ingin anda jadikan sticker", quoted: msg })
            
          try {
            var [atu, dua] = q.split("|");
            sock.sendFile(
              m.from,
              await sticker(
                (await m.download()) || (await m.quoted.download()),
                atu || msg.pushName,
                dua || "onlyvan.dev"
              ),
              {
                quoted: msg,
              }
            );
          } catch {
            return sock.reply(
              from,
              "reply gambar/video maksimal 10 detik",
              msg
            );
          }
          break;
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
          break;
        case "listaudio":
          sock.reply(
            from,
            `*LIST AUDIO EFFECT*

_yang menggunakan nominal, contoh_ *bass 10*
bass 
treble 
vibra
speed _contoh, *1.5*, *0.85* sepeeti di youtube/tiktok_
volume 

_yang tidak menggunakan apapun_
slow
reverb 
fast`,
            msg
          );
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
          if (
            /bass|reverb|slow|cut|fast|speed|vibra|fade|treble|volume/.test(
              body.toLowerCase()
            )
          ) {
            var [arg1, arg2] = body.split(" ");
            await sock.sendMessage(
              m.from,
              {
                audio: await AUDIO.create(await m.quoted.download(), {
                  [arg1.toLowerCase()]: arg2 || null,
                }),
                mimetype: "audio/mpeg",
                ptt: true,
              },
              {
                quoted: msg,
              }
            );
            console.log("done");
          }
          if (m.type == "vieOnceMessageV2" && !m.key.fromMe) {
            console.log("VIEWONCE DETECTED !!");
            var tipeQuot = Object.keys(msg.message)[0];
            if (tipeQuot == "viewOnceMessageV2") {
              var anu = msg.message.viewOnceMessageV2.message;
              var tipe = Object.keys(anu)[0];
              delete anu[tipe].viewOnce;
              var ah = {};
              if (anu[tipe].caption) ah.caption = anu[tipe].caption;
              if (anu[tipe]?.contextInfo?.mentionedJid) {
                ah.contextInfo = {};
                ah.contextInfo.mentionedJid =
                  anu[tipe]?.contextInfo?.mentionedJid || [];
              }
              var dta = await baileys.downloadContentFromMessage(
                anu[tipe],
                tipe.split("M")[0]
              );
              sock.sendMessage(
                owner[0],
                {
                  [tipe.split("M")[0]]: await streamToBuff(dta),
                  ...ah,
                },
                {
                  quoted: msg,
                }
              );
            }
            if (tipeQuot == "documentMessage") {
              var text = (await m.quoted.download()).toString();
              if (text.length >= 65000) text.slice(65000);
              sock.reply(owner[0], text, msg);
            }
          }
      }
    } catch (e) {
      console.log(e);
    }
  });
};
/*const app = express();
app.get("/", (req, res) => res.sendFile(process.cwd() + "/kontol.html"));

app.get("/", (req, res) => res.sendFile(process.cwd() + "/kontol.html"));
app.get("/eval", async(req, res) => {
  var q = req.query.q
  var arg = q.split(" ")[0] == ">" ? q.split(" ")[1] : "return " + q.split(" ")[1]
          try {
            var text = util.format(await eval(`(async()=>{ ${arg} })()`));
            res.send(text);
          } catch (e) {
            let _syntax = "";
            let _err = util.format(e);
            let err = syntaxerror(arg, "EvalError", {
              allowReturnOutsideFunction: true,
              allowAwaitOutsideFunction: true,
              sourceType: "module",
            });
            if (err) _syntax = err + "\n\n";
            res.send(util.format(_syntax + _err))
          }
})
app.listen(8088, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", 80);
});*/
main("session").then((p) =>
  console.log("Connected...")
);
/*
Made With by @dcodedenpa & @ivanz
*/

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
let ytRegex =
  /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;

async function youtubedl(url) {
  const { data: html } = await axios.get("https://yt5s.com/en32");
  const urlAjax = (/k_url_search="(.*?)"/.exec(html) || ["", ""])[1];
  const urlConvert = (/k_url_convert="(.*?)"/.exec(html) || ["", ""])[1];
  const params = {
    q: url,
    vt: "home",
  };
  const { data: json } = await axios({
    method: "POST",
    url: urlAjax,
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie:
        "__cflb=04dToSoFRg9oqH9pYF2En9gKJK4fe8D9TcYtUD6tYu; _ga=GA1.2.1350132744.1641709803; _gid=GA1.2.1492233267.1641709803; _gat_gtag_UA_122831834_4=1",
      origin: "https://yt5s.com",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    },
    data: new URLSearchParams(Object.entries(params)),
  });
  const video = {};
  Object.values(json.links.mp4).forEach(({ k, size }) => {
    video[k] = {
      quality: k,
      fileSizeH: size,
      fileSize: parseFloat(size) * (/MB$/.test(size) ? 1000 : 1),
      // @ts-ignore
      download: convertv2.bind(
        null,
        urlConvert,
        json.vid,
        "mp4",
        k,
        json.token,
        parseInt(json.timeExpires),
        json.fn
      ),
    };
  });
  const audio = {};
  Object.values(json.links.mp3).forEach(({ key, size }) => {
    audio[key] = {
      quality: key,
      fileSizeH: size,
      fileSize: parseFloat(size) * (/MB$/.test(size) ? 1000 : 1),
      // @ts-ignore
      download: convertv2.bind(
        null,
        urlConvert,
        json.vid,
        "mp3",
        key.replace(/kbps/i, ""),
        json.token,
        parseInt(json.timeExpires),
        json.fn
      ),
    };
  });

  const res = {
    id: json.vid,
    title: json.title,
    thumbnail: `https://i.ytimg.com/vi/${json.vid}/0.jpg`,
    video,
    audio,
  };
  return res;
}
function convertv2(url, v_id, ftype, fquality, token, timeExpire, fname) {
  return new Promise(async (resolve, reject) => {
    const params = {
      v_id,
      ftype,
      fquality,
      token,
      timeExpire,
      client: "yt5s.com",
    };
    try {
      const headers = {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://yt5s.com",
        referer: "https://yt5s.com/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "X-Requested-Key": "de0cfuirtgf67a",
      };
      const { data: resServer } = await axios.post(url, params, { headers });
      const server = resServer.c_server;
      if (!server && ftype === "mp3") {
        return resolve(server || resServer.d_url || "");
      }
      const payload = {
        v_id,
        ftype,
        fquality,
        fname,
        token,
        timeExpire,
      };
      const { data: results } = await axios.post(
        `${server}/api/json/convert`,
        payload
      );
      if (results.statusCode === 200) {
        return resolve(results.result);
      } else if (results.statusCode === 300) {
        try {
          const WebSocket = require("ws");
          const Url = new URL(server);
          const WSUrl = `${/https/i.test(Url.protocol) ? "wss:" : "ws:"}//${
            Url.host
          }/sub/${results.jobId}?fname=yt5s.com`;
          const ws = new WebSocket(WSUrl, {
            headers: {
              "Accept-Encoding": "gzip, deflate, br",
              Host: Url.host,
              Origin: "https://yt5s.com",
              "Sec-WebSocket-Extensions":
                "permessage-deflate; client_max_window_bits",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            },
          });
          ws.on("message", function incoming(message) {
            const msg = JSON.parse(message.toString());
            if (msg.action === "success") {
              try {
                ws.close();
              } catch (e) {
                console.error(e);
              }
              ws.removeAllListeners("message");
              return resolve(msg.url);
            } else if (msg.action === "error") {
              return reject(msg);
            }
          });
        } catch (e) {
          console.error(e);
          return reject(e);
        }
      } else {
        return reject(results);
      }
    } catch (err) {
      return reject(err);
    }
  });
}
async function savefrom() {
  let body = new URLSearchParams({
    sf_url: encodeURI(arguments[0]),
    sf_submit: "",
    new: 2,
    lang: "id",
    app: "",
    country: "id",
    os: "Windows",
    browser: "Chrome",
    channel: " main",
    "sf-nomad": 1,
  });
  let { data } = await axios({
    url: "https://worker.sf-tools.com/savefrom.php",
    method: "POST",
    data: body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://id.savefrom.net",
      referer: "https://id.savefrom.net/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36",
    },
  });
  let exec = '[]["filter"]["constructor"](b).call(a);';
  data = data.replace(
    exec,
    `\ntry {\ni++;\nif (i === 2) scriptResult = ${
      exec.split(".call")[0]
    }.toString();\nelse (\n${exec.replace(/;/, "")}\n);\n} catch {}`
  );
  let context = {
    scriptResult: "",
    i: 0,
  };
  vm.createContext(context);
  new vm.Script(data).runInContext(context);
  return JSON.parse(
    context.scriptResult
      .split("window.parent.sf.videoResult.show(")?.[1]
      .split(");")?.[0]
  );
}
async function videoToWebp(media) {
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`
  );
  fs.writeFileSync(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
        "-loop",
        "0",
        "-ss",
        "00:00:00",
        "-t",
        "00:00:05",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);
  return buff;
}

async function savingMedia(media) {
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`
  );
  fs.writeFileSync(tmpFileOut, media);
  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  return buff;
}

async function writeExifImg(media, metadata) {
  let wMedia = await imageToWebp(media);
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  fs.writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/VanzGantengz`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      "android-app-store-link":
        "https://play.google.com/store/apps/details?id=com.mobile.legends",
      "ios-app-store-link":
        "https://itunes.apple.com/app/sticker-maker-studio/id1443326857",
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}

async function writeExifVid(media, metadata) {
  let wMedia = await videoToWebp(media);
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  fs.writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/VanzGantengz`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      "android-app-store-link":
        "https://play.google.com/store/apps/details?id=com.mobile.legends",
      "ios-app-store-link":
        "https://itunes.apple.com/app/sticker-maker-studio/id1443326857",
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}

async function writeExifStc(media, metadata) {
  let wMedia = await savingMedia(media);
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  fs.writeFileSync(tmpFileIn, wMedia);
  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/VanzGantengz`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      "android-app-store-link":
        "https://play.google.com/store/apps/details?id=com.mobile.legends",
      "ios-app-store-link":
        "https://itunes.apple.com/app/sticker-maker-studio/id1443326857",
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}
async function imageToWebp(media) {
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`
  );
  fs.writeFileSync(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });
  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);
  return buff;
}

async function videoToWebp(media) {
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`
  );
  fs.writeFileSync(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
        "-loop",
        "0",
        "-ss",
        "00:00:00",
        "-t",
        "00:00:05",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);
  return buff;
}

async function writeExif(media, metadata) {
  let wMedia = /webp/.test(media.mimetype)
    ? media.data
    : /image/.test(media.mimetype)
    ? await imageToWebp(media.data)
    : /video/.test(media.mimetype)
    ? await videoToWebp(media.data)
    : "";
  const tmpFileIn = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = path.join(
    ".tmp",
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  fs.writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/VanzGantengz`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      "android-app-store-link":
        "https://play.google.com/store/apps/details?id=com.mobile.legends",
      "ios-app-store-link":
        "https://itunes.apple.com/app/sticker-maker-studio/id1443326857",
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}
let set = new Set();

function chatsAdd(m) {
  set.add(m);
  setTimeout(() => {
    set.delete(m);
  }, 1000);
}

function chatsHas(m) {
  return !!set.has(m);
}

function Audio() {
  this.ingfo = "apa coba";
}

Audio.prototype.bass = function (path, length) {
  return this.sox(path, null, `bass ${length}`);
};
Audio.prototype.treble = function (path, length) {
  return this.sox(path, null, `treble ${length}`);
};
Audio.prototype.fade = function (path, length) {
  return this.sox(path, null, `fade ${length.split("").join(" ")}`);
};
Audio.prototype.repeat = function (path, length) {
  return this.sox(path, null, `repeat ${length}`);
};
Audio.prototype.volume = function (path, length) {
  return this.sox(path, null, `gain ${length}`);
};
Audio.prototype.reverb = function (path) {
  return this.sox(path, null, "reverb 100 100 100 100 0 2");
};
Audio.prototype.slow = function (path) {
  return this.sox(path, null, "speed 0.85");
};
Audio.prototype.fast = function (path) {
  return this.sox(path, null, "speed 1.25");
};
Audio.prototype.speed = function (path, length) {
  return this.sox(path, null, "speed " + length);
};
Audio.prototype.reverse = function (path) {
  return this.sox(path, null, "reverse");
};
Audio.prototype.vibra = function (path, length, out) {
  return this.ffmpeg(path, `-filter_complex "vibrato=f=${length}"`, out);
};

Audio.prototype.cut = function (path, arr, out) {
  path = this.toPath(path);
  console.log("PATH", path);
  ar = arr.split("-");
  let outname = this.randomFilename();
  let ff = cp
    .execSync(`ffmpeg -ss ${ar[0]} -i ${path} -t ${ar[1]} -c copy ${outname}`)
    .toString();
  if (ff.length == 0) return fs.readFileSync(outname);
};

Audio.prototype.robot = function (path) {
  return this.ffmpeg(
    path,
    `-filter_complex "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"`,
    arguments[2]
  );
};

Audio.prototype.tempo = function (path, length, out) {
  return this.ffmpeg(path, `-filter:a "atempo=1.0,asetrate=${length}"`, out);
};

Audio.prototype.cool = function (path, delay = 2, out) {
  return this.ffmpeg(
    path,
    `-af "aecho=in_gain=0.5:out_gain=0.5:delays=2:decays=0.2"`
  );
};
Audio.prototype.create = function () {
  return new Promise(async (res) => {
    let [key, val] = [Object.keys(arguments[1]), Object.values(arguments[1])];
    let path = arguments[0];
    let i = 0;
    let hm = [];
    while (i < key.length && val.length) {
      if (i == 0) hm.push(await this[key[i]](path, val[i]));
      if (i == 1) hm.push(await this[key[i]](hm[i - 1], val[i]));
      if (i == 2) hm.push(await this[key[i]](hm[i - 1], val[i]));
      if (i == 3) hm.push(await this(key[i])(hm[i - 1], val[i]));
      if (i == 4) hm.push(await this(key[i])(hm[i - 1], val[i]));
      i++;
    }
    res(hm[hm.length - 1]);
  });
};

Audio.prototype.ffmpeg = function (filename, command, out) {
  filename = this.toPath(filename);
  var outname = out || this.randomFilename();
  var ff = cp
    .execSync(`ffmpeg -i ${filename} ${command} ${outname} -y`)
    .toString();
  var file = fs.readFileSync(outname);
  fs.unlinkSync(outname);
  if (ff.length == 0) return file;
};
Audio.prototype.sox = function (filename, out, command) {
  filename = mp3ToWav(simpan(".tmp/" + getRandom("mp3"), filename));
  var outname = out || ".tmp/" + getRandom("wav");
  var ff = cp.execSync(`sox ${filename} ${outname} ${command}`).toString();
  if (ff.length == 0) return outname;
  fs.unlinkSync(outname);
};

Audio.prototype.randomFilename = function () {
  return ".tmp/" + Math.floor(Math.random() * 100 * 100) + ".mp3";
};
Audio.prototype.toWav = function () {
  let buff = arguments[0];
  if (!Buffer.isBuffer(buff)) {
    if (!fs.existsSync(buff))
      throw this.makeError("no such file directory", "Error: ENOENT");
    return buff;
  }
  let file = this.randomFilename();
  fs.writeFileSync(file, buff);
  return file;
};
Audio.prototype.toPath = function () {
  let buff = arguments[0];
  if (!Buffer.isBuffer(buff)) {
    if (!fs.existsSync(buff))
      throw this.makeError("no such file directory", "Error: ENOENT");
    return buff;
  }
  let file = this.randomFilename();
  fs.writeFileSync(file, buff);
  return file;
};

Audio.prototype.makeError = function (message, name) {
  let err = new Error();
  err.name = name;
  err.message = message;
  return err;
};

const AUDIO = new Audio();

async function sticker(buffer, packname = "VynBOT", author = "@ivanz") {
  var imgType = await (
    await (await import("file-type")).fileTypeFromBuffer(buffer)
  ).mime;
  var buffer;
  if (imgType == "image/webp")
    buffer = await writeExifStc(buffer, {
      packname,
      author,
    });
  if (imgType == "image/jpeg")
    buffer = await writeExifImg(buffer, {
      packname,
      author,
    });
  if (imgType == "image/png")
    buffer = await writeExifImg(buffer, {
      packname,
      author,
    });
  if (imgType == "video/mp4")
    buffer = await writeExifVid(buffer, {
      packname,
      author,
    });
  return buffer;
}
async function toAudio(buffer) {
  var filename = getRandom("mp4");
  var out = getRandom("mp3");
  await simpan(".tmp/" + filename, buffer);
  var outname = cp.execSync(`ffmpeg -i ${".tmp/" + filename} ${".tmp/" + out}`);
  return baca(".tmp/" + out);
}
async function toImage(buffer) {
  var filename = getRandom("webp");
  var out = getRandom("png");
  await simpan(".tmp/" + filename, buffer);
  var outname = cp.execSync(`ffmpeg -i ${".tmp/" + filename} ${".tmp/" + out}`);
  return baca(".tmp/" + out);
}
function getRandom(ext) {
  ext = ext || "";
  return `${Math.floor(Math.random() * 100000)}.${ext}`;
}
function hapus(path) {
  fs.unlinkSync(path);
  return path;
}
function baca(path) {
  return fs.readFileSync(path);
}
function simpan(path, buff) {
  fs.writeFileSync(path, buff);
  return path;
}

async function telegra(buffer) {
  var ftp = await (await import("file-type")).fileTypeFromBuffer(buffer);
  let file = Buffer.isBuffer(buffer)
    ? simpan(".tmp/" + getRandom(ftp.ext), buffer)
    : buffer;
  let form = new FormData();
  form.append("file", fs.createReadStream(file), "kontol.jpg");
  let res = await (
    await fetch("https://telegra.ph/upload", {
      method: "POST",
      body: form,
    })
  ).json();
  return "https://telegra.ph" + res[0].src;
}
async function anonfile(buffer) {
  var { ext } = await (await import("file-type")).fileTypeFromBuffer(buffer);
  var suk = simpan(".tmp/" + getRandom(ext), buffer);
  var curl = cp
    .execSync(`curl -F "file=@${suk}" https://gofile.cc/api/v1/upload`)
    .toString();
  return JSON.parse(util.format(curl)).data.file;
}
async function capcutdl(Url) {
  try {
    let { request } = await axios.get(Url);
    let res = request.res.responseUrl;
    let token = res.match(/\d+/)[0];
    const { data } = await axios({
      url: `https://ssscap.net/api/download/${token}`,
      method: "GET",
      headers: {
        Cookie:
          "sign=2cbe441f7f5f4bdb8e99907172f65a42; device-time=1685437999515",
      },
    });
    return data;
  } catch (error) {
    console.log(error);
  }
}
function mp3ToWav(inputFile) {
  const outputFile = ".tmp/" + getRandom("wav");
  const command = `ffmpeg -i ${inputFile} ${outputFile}`;
  cp.execSync(command);
  return outputFile;
}

function wavToMp3(inputFile, bitrate = "192k") {
  const outputFile = ".tmp/" + getRandom("mp3");
  const command = `ffmpeg -i ${inputFile} -b:a ${bitrate} ${outputFile}`;
  cp.execSync(command);
  return outputFile;
}
async function addCase(newCase, filePath = "index.js") {
  try {
    let fileContent = fs.readFileSync(filePath, "utf-8");
    let switchPosition = fileContent.indexOf("switch (command) {");
    if (switchPosition === -1) {
      return;
    }
    let caseStartPos = fileContent.indexOf("case", switchPosition);
    if (caseStartPos === -1) {
      return;
    }
    let caseToInsert = `  ${newCase}\n`;
    fileContent =
      fileContent.slice(0, caseStartPos) +
      caseToInsert +
      fileContent.slice(caseStartPos);
    fs.writeFileSync(filePath, fileContent);
    await baileys.delay(1000);
    cp.execSync("pm2 restart all");
  } catch (error) {
    return error;
  }
}
async function tiktok(url) {
  var _url = "https://api.tiklydown.eu.org/api/download?url=" + url;
  return (await axios.get(_url)).data;
}
async function quest(query) {
return await (await axios("https://chatgpt4.my.id/api/processdata?question="+encodeURIComponent(encodeURIComponent(encodeURIComponent(query))))).data.response
}
async function quest1(query) {
  const requestData = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://ai.qidianym.net/",
      accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      prompt: query,
      options: {},
      regenerate: false,
      roomId: 1002,
      uuid: Date.now(),
      systemMessage: query,
      top_p: 1,
      temperature: 0.8,
    }),
  };

  const response = await fetch(
    "https://ai.qidianym.net/api/chat-process",
    requestData
  );
  const data = await response.text();
  // Handle the response data here
  let out = JSON.parse(data.split("\n").pop());
  console.log("quests", out);
  return out;
}
async function quest22(text) {
  try {
    const { data } = await axios(
      `https://onlinegpt.org/wp-json/mwai-ui/v1/chats/submit`,
      {
        method: "post",
        data: {
          botId: "default",
          newMessage: text,
          stream: false,
        },
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
      }
    );
    return data.reply
  } catch (err) {
    console.log(err.response.data);
    return err.response.data.message;
  }
}
async function upload(buffer) {
 return new Promise(async (resolve, reject) => {
 try {
 var { ext } = await (await import("file-type")).fileTypeFromBuffer(buffer);
 var mediaPath = simpan(".tmp/" + getRandom(ext), buffer);
 const media = fs.createReadStream(mediaPath);
 let form = new FormData();
 form.append("files[]", media);

 const response = await axios.post("https://pomf.lain.la/upload.php", form, {
 headers: {
 "Content-Type": "multipart/form-data",
 "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
 ...form.getHeaders()
 }
 });
 const url = response.data.files[0].url;
 resolve(url);
 } catch (error) {
 reject(error);
 }
 });
}
async function yete(url) {
const res = await axios.get(url)
const $ = cheerio.load(res.data)
var ytInitialPlayerResponse;
let sc = $([...$("script")].find(v => $(v).text().includes("ytInitialPlayerResponse"))).text().split("= ")[1]
sc = JSON.parse(sc.slice(0, sc.length-1))

const formats = [...sc.streamingData.formats, ...sc.streamingData.adaptiveFormats]

var kP = {
  bg: function(a, b) {
    a.splice(0, b)
  },
  qD: function(a, b) {
    var c = a[0];
    a[0] = a[b % a.length];
    a[b % a.length] = c
  },
  CV: function(a) {
    a.reverse()
  }
};
var cNa = function(a) {
  a = a.split("");
  kP.bg(a, 2);
  kP.CV(a, 69);
  kP.qD(a, 14);
  kP.bg(a, 1);
  kP.CV(a, 69);
  kP.qD(a, 29);
  kP.CV(a, 20);
  return a.join("")
};
var gma = function(a) {
  var b = a.split(""),
    c = ["(\"']\u22c5", 1805813597, 111055091, function(d, e, f, h, l, m, n, p) {
        return e(f, h, l, m, n, p)
      },
      -496344789, 1706542759,
      function(d, e) {
        e = (e % d.length + d.length) % d.length;
        d.splice(-e).reverse().forEach(function(f) {
          d.unshift(f)
        })
      },
      -1064003792,
      function(d) {
        for (var e = d.length; e;) d.push(d.splice(--e, 1)[0])
      },
      -1607923262, -1156538622,
      function() {
        for (var d = 64, e = []; ++d - e.length - 32;) {
          switch (d) {
            case 91:
              d = 44;
              continue;
            case 123:
              d = 65;
              break;
            case 65:
              d -= 18;
              continue;
            case 58:
              d = 96;
              continue;
            case 46:
              d = 95
          }
          e.push(String.fromCharCode(d))
        }
        return e
      },
      -1501170068, 1461644125,
      function() {
        for (var d = 64, e = []; ++d - e.length - 32;) switch (d) {
          case 46:
            d = 95;
          default:
            e.push(String.fromCharCode(d));
          case 94:
          case 95:
          case 96:
            break;
          case 123:
            d -= 76;
          case 92:
          case 93:
            continue;
          case 58:
            d = 44;
          case 91:
        }
        return e
      },
      53853370, 595937758, 294274185, 652889302, 1013034686,
      function(d, e) {
        d.splice(d.length, 0, e)
      },
      -1226552037, -272686419, 782100347, -2031728996,
      function(d, e, f, h, l, m, n) {
        return d(l, m, n)
      },
      490200019, 631776684,
      function(d, e, f) {
        var h = f.length;
        e.forEach(function(l, m, n) {
          this.push(n[m] = f[(f.indexOf(l) - f.indexOf(this[m]) + m + h--) % f.length])
        }, d.split(""))
      },
      "2ExFCHo",
      function(d) {
        d.reverse()
      },
      function(d, e) {
        if (0 != d.length) {
          e = (e % d.length + d.length) % d.length;
          var f = d[0];
          d[0] = d[e];
          d[e] = f
        }
      },
      1146394047, 2037593004, null, 978042057, -1873580617, 96027507,
      function(d, e, f, h, l, m, n, p) {
        return e(f, h, l, m, n, p)
      },
      490445223, 1655692191,
      function(d, e, f, h, l, m) {
        return e(h, l, m)
      },
      -1041310078, -1561517191, -1016222278, "finally", -169411003, null, -526959029, -538340808, -129249498, 1876424669,
      function(d, e) {
        for (e = (e % d.length + d.length) % d.length; e--;) d.unshift(d.pop())
      },
      1382813731, -1015291001, null, -1632277230,
      function() {
        for (var d = 64, e = []; ++d - e.length - 32;) {
          switch (d) {
            case 58:
              d -= 14;
            case 91:
            case 92:
            case 93:
              continue;
            case 123:
              d = 47;
            case 94:
            case 95:
            case 96:
              continue;
            case 46:
              d = 95
          }
          e.push(String.fromCharCode(d))
        }
        return e
      },
      -635607689,
      function(d, e) {
        0 != d.length && (e = (e % d.length + d.length) % d.length, d.splice(0, 1, d.splice(e, 1, d[0])[0]))
      },
      b, -850053320,
      function(d, e, f, h, l) {
        return e(f, h, l)
      },
      403283989, -1936642892, -1619839756, 890653766, b, -42495439, -295996764,
      function() {
        for (var d = 64, e = []; ++d - e.length - 32;) switch (d) {
          case 58:
            d = 96;
            continue;
          case 91:
            d = 44;
            break;
          case 65:
            d = 47;
            continue;
          case 46:
            d = 153;
          case 123:
            d -= 58;
          default:
            e.push(String.fromCharCode(d))
        }
        return e
      },
      function(d, e) {
        d = (d % e.length + e.length) % e.length;
        e.splice(d, 1)
      },
      "17BUocB", 705187307, b, -2072191741, 988580840
    ];
  c[34] = c;
  c[47] = c;
  c[55] = c;
  try {
    try {
      (-4 == c[40] || ((0, c[62])((0, c[62])(((0, c[8])(c[67]), c[41])((0, c[6])(c[55], c[58]), c[59], (0, c[59])(c[31], c[63]), c[2], c[22]) & (0, c[7])(c[Math.pow(8, 4) - 171 - 3870], c[3]), c[33], c[60], c[90 + Math.pow(3, 4) + -112]), c[41], c[8], c[10], (0, c[24])()), 0)) && (0, c[7])(c[53], c[73]) << ((((0, c[44])(c[68], c[30]), (0, c[75])((0, c[7])(c[62], c[60]), c[7], c[40], c[3]), c[65])(c[68], c[56]), c[7])(c[36], c[10]) ^ (0, c[41])(c[42], c[73], (0, c[27])())), (-5 === c[39] || ((0, c[75])((0, c[7])(c[18],
        c[10]), c[72], c[73], c[48]), 0)) && (0, c[75])((0, c[7])(c[49], c[60]), c[7], c[25], c[-17 * Math.pow(1, 3) - -27])
    } catch (d) {
      (0, c[75])((0, c[41])(c[8], c[10], (0, c[6])()), c[144 - 103 % Math.pow(6, 4)], c[58], c[3], (0, c[6])())
    } finally {
      2 < c[11] && ((0, c[54])(((0, c[-1008 + 21 * Math.pow(7, 2)])(c[3]), c[7])(c[34], c[10]) * (0, c[7])(c[57], c[68]), c[19], (0, c[7])(c[50], c[10]), c[47], c[1605652 + -49 * Math.pow(8, 5)]), 1) || (0, c[51])((0, c[19])(c[60], c[1]), c[47], (0, c[47])(((0, c[16])(c[40], c[76]), c[57])(c[52], c[60]), c[5], c[0], c[52]), c[44], c[45], c[18870 -
        Math.pow(2, new Date("1970-01-01T01:30:05.000+01:30") / 1E3) - 18819]), -3 < c[new Date("1969-12-31T12:31:15.000-11:30") / 1E3] ? (0, c[47])((0, c[37])(c[45], c[11]), c[71], c[60]) : (0, c[37])(c[60], c[55]) | (0, c[37])(c[40], c[50]), -6 >= c[44] && (7 >= c[69] ? (((0, c[14])(c[15], c[46], (0, c[-35427 - Math.pow(7, 4) - -37885])()), c[27])((0, c[17])(c[46], c[32]) ^ (0, c[38])(c[46], c[42]), c[14], (0, c[14])(c[59], c[new Date("1969-12-31T12:45:46.000-11:15") / 1E3], (0, c[75])()), c[59], c[54], (0, c[432 % Math.pow(3, 1) + 43])()), c[14])(c[59], c[46], (0, c[57])()) >>>
        (0, c[58])(c[68], c[41]) : ((0, c[38])(c[46], c[2]), c[27])((0, c[38])(c[new Date("1969-12-31T19:00:41.000-05:00") / 1E3], c[47]), c[144 + Math.pow(4, 3) + -186], (((0, c[0])((0, c[45])(c[62], c[6], (0, c[30])()), c[47], c[77]), c[45])(c[46], c[77], (0, c[74])()), c[76])(c[72], c[38640 - Math.pow(new Date("1969-12-31T18:30:05.000-05:30") / 1E3, 3) - 38474]), c[64], c[12])), -3 !== c[39] && (0, c[new Date("1970-01-01T06:00:04.000+06:00") / 1E3])(((((0, c[38])(c[61], c[37]), (0, c[new Date("1969-12-31T20:30:04.000-03:30") / 1E3])((0, c[17])(c[54], c[34]),
          c[6], c[41], c[78]), c[11])(c[72], (0, c[new Date("1970-01-01T04:45:38.000+04:45") / 1E3])(c[33], c[55]), (0, c[18])(c[42], c[66]), (0, c[Math.pow(5, 1) + -13664 + 13698])(c[47], c[67]), c[55]) - (0, c[39])(c[178 % (new Date("1970-01-01T04:03:20.000+04:00") / 1E3) - Math.pow(7, 2) + new Date("1970-01-01T05:58:46.000+06:00") / 1E3], c[58 * Math.pow(4, 5) + -59373])) * (0, c[59])(c[26], c[62]), (0, c[new Date("1969-12-31T13:00:46.000-11:00") / 1E3])(c[2], c[9]), c[71])(c[55], c[63]) <= ((0, c[46])(c[47], c[74]), c[39])(c[47], c[3600 - Math.pow(4, 3) - 3487]),
        c[87079 - 170 * Math.pow(8, new Date("1969-12-31T19:00:03.000-05:00") / 1E3)], c[34], c[20])
    }
    try {
      9 <= c[20] ? (((0, c[35])(c[26], c[1]), c[10])(c[6], c[50]), c[41 % (new Date("1969-12-31T20:47:16.000-03:15") / 1E3) + Math.pow(4, 5) + -1006])(c[24], c[11], (0, c[8])()) : ((0, c[49])((0, c[10])(c[6], c[14]), c[61], c[78]), c[69])(c[73], c[75]), (0, c[30])((0, c[18])(c[54]), c[76], c[1], c[0])
    } catch (d) {}
  } catch (d) {
    return "enhanced_except_05oBrOX-_w8_" + a
  }
  return b.join("")
};
formats.map((f)=> {
  if (!f.signatureCipher) return
  const anu = qs.parse(f.signatureCipher)
  const url = new URL(decodeURIComponent(anu.url))
  const n = url.searchParams.get("n")
  
  url.searchParams.set(anu.sp || "signature", cNa(anu.s))
  url.searchParams.set("n", gma(n))
  f.url = url.toString()
  delete f.signatureCipher
})
var results = {}
results.detail = sc.videoDetails
results.formats = formats
return results
}
