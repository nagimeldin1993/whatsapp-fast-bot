const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // كتم أي عمليات جانبية لتوفر كل السرعة للرد
        printQRInTerminal: true 
    });

    sock.bind( 'creds.update', saveCreds );

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log('✅ البوت متصل الآن بأقصى سرعة!');
    });

    // الاستماع الفوري والرد السريع جداً
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages;
        if (!msg.key.fromMe && m.type === 'notify') {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            
            // الفحص الفوري لكلمة المروج
            if (text.includes("المروج")) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'تم' }, { quoted: msg });
            }
        }
    });
}
startBot().catch(err => console.error(err));
