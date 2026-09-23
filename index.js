const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// السيرفر الوهمي لإرضاء Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is perfectly running!');
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server active on port ${PORT}`);
});

async function startBot() {
    // تم تغيير اسم المجلد إلى session_new لإنشاء اتصال نظيف وجديد تماماً وتجنب التكرار
    const { state, saveCreds } = await useMultiFileAuthState('session_new');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: true,
        connectTimeoutMs: 60000, // إعطاء مهلة دقيقة كاملة للاتصال
        defaultQueryTimeoutMs: 0
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // طباعة تأكيدية في السجلات عند ظهور الـ QR
        if (qr) {
            console.log('🔄 تم إنشاء الـ QR Code بنجاح! جاهز للمسح الآن.');
        }
        
        if (connection === 'open') {
            console.log('✅ البوت متصل الآن بأقصى سرعة ومستعد للقنص!');
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            // إذا كان الخطأ بسبب انتهاء صلاحية الـ QR أو جهاز غير مرتبط، لا يعيد التشغيل فوراً لكي لا يرمش
            const shouldReconnect = statusCode !== 401 && statusCode !== 411;
            console.log(`تم قطع الاتصال (كود: ${statusCode})، إعادة الاتصال: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000); // تأخير إعادة التشغيل 5 ثوانٍ لحماية السيرفر
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0]; // قراءة الرسالة الأولى المباشرة لزيادة السرعة
        
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            
            if (text.includes("المروج")) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'تم' });
                console.log(`⚡ تم قنص الطلب بنجاح والرد بـ "تم"`);
            }
        }
    });
}

startBot().catch(err => console.error("خطأ في تشغيل البوت:", err));

