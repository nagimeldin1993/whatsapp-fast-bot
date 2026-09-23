

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); // مكتبة مدمجة لفتح المنفذ وحل مشكلة ريندر

// إنشاء سيرفر وهمي بسيط لإرضاء فحص Render ومنع السيرفر من إعادة التشغيل المستمرة
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is perfectly running!');
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server active on port ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // كتم العمليات لتوفر كل السرعة للرد
        printQRInTerminal: true 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ البوت متصل الآن بأقصى سرعة ومستعد للقنص!');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('تم قطع الاتصال، جاري إعادة الاتصال تلقائياً...', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0];
        
        if (!msg.key.fromMe) {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            
            if (text.includes("المروج")) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'تم' });
                console.log(`⚡ تم قنص الطلب بنجاح والرد بـ "تم"`);
            }
        }
    });
}

startBot().catch(err => console.error("خطأ في تشغيل البوت:", err));
