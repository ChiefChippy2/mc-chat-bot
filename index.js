require('dotenv').config();
const mc = require('minecraft-protocol');
const Discord = require('discord.js');
const handlePercent = require('./utils');
const disc = new Discord.Client({intents: ['GUILD_MESSAGES']});
const id = process.env.CHANNEL;
const token = process.env.TOKEN;
const owners = [process.env.OWNERS?.split?.(' ')||''].flat();
let lastDisconnects = 0;
disc.login(token);
let client = mc.createClient({
  host: process.env.HOST,
  port: process.env.PORT || 25565,
  username: process.env.BOT_NAME,
  version: process.env.VERSION,
});
const endfunc = function(...args) {
  if(this === true) console.log("Error : ", ...args); // Logs any eventual error
  console.log('Reconnecting...');

  // Limit reconnects
  lastDisconnects ++;
  setTimeout(()=>lastDisconnects--, 20000);

  let delay = 2000;
  if (lastDisconnects > 5) delay += 7500; // If there had been too many disconnects, wait a little more

  online = false;
  setTimeout(()=>{
    client = mc.createClient({
      host: process.env.HOST,
      port: process.env.PORT || 25565,
      username: process.env.BOT_NAME,
      version: process.env.VERSION,
    });
    bindChat();
  }, delay);
};
bindChat();
let online = true;
/**
 * Parses mc message
 * @param {Record<string, string|Record>} msg Message
 * @return {string|undefined}
 */
function parseMsg(msg) {
  if (msg.translate) {
    return handlePercent(msg.with, msg.translate);
  } else {
    return msg.text+(msg?.extra?.map(parseMsg)?.join('')||'');
  }
}
let msgs=[];
disc.on('ready', async ()=>{
  const channel = await disc.channels.fetch(id);
  if (!channel) process.exit(1);
  setInterval(()=>{
    if (!msgs.length||!online) return;
    channel.send(msgs.join('\n'));
    msgs = [];
  }, 2000);
});
disc.on('message', (msg)=>{
  if (msg.author.bot||msg.channel.id!==id) return;
  if (msg.content==='.ping') {
    msg.channel.send(`Pong!\nDiscord : ${disc.ws.ping}\nMC : ${client.latency}`)
        .then((sent)=>setTimeout(sent.delete.bind(sent), 5000));
  }
  setImmediate(msg.delete.bind(msg));
  // eslint-disable-next-line
  if (msg.content[0]==='/' && owners.includes(msg.author.id)) return chat({
    message: msg.content,
  });
  if (!msg.content||msg.content[0]==='/'||msg.content==='.ping') return;
  chat({
    // eslint-disable-next-line
    message: `[Discord] ${msg.member.displayName} : ${msg.cleanContent.replace(/§./g,'').replace(/^(.{200}).+$/, '$1...')}`,
    sender: 0,
    position: 0});
});
const lastMsgs = [];
/**
 * Chats to mc server
 * @param {Record<string, any>} payload Payload
 */
function chat(payload) {
  lastMsgs.push(payload.message);
  client.write('chat', payload);
}
/**
 * Binds chat listener
 */
function bindChat() {
  client.on('chat', (packet)=>{
    if (!online) console.log('(Re)connected!');
    online=true;
    const jsonMsg = JSON.parse(packet.message);
    if (process.env.DEBUG) console.log(jsonMsg);
    if (jsonMsg.translate === 'chat.disabled.options') enableChat();
    if (jsonMsg?.with?.[0]?.text === process.env.BOT_NAME) return; // echo
    const content = parseMsg(jsonMsg).replace(/§./g, '');
    // eslint-disable-next-line
    if (content.trim().startsWith(`<${process.env.BOT_NAME}>`)) lastMsgs.shift(); // Placeholder... @TODO
    if (content && content!='undefined') msgs.push(content);
  });
  client.once('chat', enableChat);
  client.on('end', endfunc);
  client.on('error', endfunc.bind(true));
}

/**
 * Enables chat
 */
function enableChat() {
  client.write('settings', {
    skinParts: 0, // Not important
    locale: 'en_GB',
    viewDistance: 2,
    chatColors: false, // No need for colors
    chatFlags: 0, // 0 = everything
  });
  setTimeout(catchUp, 3000);
}

/**
 * Catches up on unsent messages hopefully
 */
function catchUp() {
  while (lastMsgs.length) client.write('chat', {message: lastMsgs.shift()});
}
