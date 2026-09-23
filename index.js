const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // كتم العمليات لتوفر كل السرعة للرد
        printQRInTerminal: true 
    });

    // تصحيح حفظ بيانات الاتصال بدون استخدام bind المتسببة في الخطأ
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

    // الاستماع الفوري والرد السريع جداً
    sock.ev.on('messages.upsert', async m => {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0];
        
        // التأكد أن الرسالة ليست من البوت نفسه
        if (!msg.key.fromMe) {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            
            // الفحص الفوري والمباشر لكلمة المروج
            if (text.includes("المروج")) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'تم' });
                console.log(`⚡ تم قنص الطلب بنجاح والرد بـ "تم" على: ${msg.key.remoteJid}`);
            }
        }
    });
}

startBot().catch(err => console.error("خطأ في تشغيل البوت:", err));

