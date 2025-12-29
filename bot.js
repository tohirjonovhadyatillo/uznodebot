'use strict';

// ============================
// 1. IMPORTS AND CONFIGURATION
// ============================
const { Telegraf, Markup, Scenes, session } = require('telegraf');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Environment variables
require('dotenv').config();

// Configuration
const CONFIG = {
    // Bot Configuration
    BOT_TOKEN: process.env.BOT_TOKEN || '8257725385:AAFCnlBveQjk8OplTtQe3kLwjlKlLXxXzlQ',
    
    // MongoDB Configuration
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://tohirjonovhadyatillo_db_user:wnSyG3Ud5EomghS1@cluster0.dpjguhn.mongodb.net/senator_bot?retryWrites=true&w=majority',
    MONGODB_OPTIONS: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1
    },
    
    // Admin Configuration
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [6873603981, 296801391],
    
    // Channels Configuration
    REQUIRED_CHANNELS: [
        {
            id: '@SENATOR_PUBGM',
            name: 'SENATOR PUBGM',
            url: 'https://t.me/SENATOR_PUBGM',
            type: 'public',
            username: '@SENATOR_PUBGM'
        },
        {
            id: '-1002226075129',
            name: 'Senator 18+',
            url: 'https://t.me/+4byxN4zF6vJhNDZi',
            type: 'private',
            invite_link: 'https://t.me/+4byxN4zF6vJhNDZi'
        },
        {
            id: '@senatorazart',
            name: 'Senator Azart',
            url: 'https://t.me/senatorazart',
            type: 'public',
            username: '@senatorazart'
        },
        {
            id: '-1002027973620',
            name: 'Senator 19+',
            url: 'https://t.me/+0IhgHgHljec1M2Zi',
            type: 'private',
            invite_link: 'https://t.me/+0IhgHgHljec1M2Zi'
        },
        {
            id: '@SENATORKUPON',
            name: 'SENATOR KUPON',
            url: 'https://t.me/SENATORKUPON',
            type: 'public',
            username: '@SENATORKUPON'
        }
    ],
    
    // Contest Configuration
    CONTESTS: {
        IPHONE: {
            name: 'iPhone 17 Pro Max',
            prize_count: 5,
            site_url: 'https://qbaff.com/L?tag=s_4361464m_94905c_&site=4361464&ad=94905&r=uz/registration',
            promo_code: 'SENATOR',
            id_pattern: /^150\d{3,12}$/,
            id_min_length: 6,
            id_max_length: 15,
            description: '5 ta iPhone 17 Pro Max telefon sovg\'a qilinadi!',
            rules: [
                'Saytga ro\'yxatdan o\'ting',
                'Promokod: SENATOR',
                'ID raqamingizni oling'
            ]
        },
        REDMI: {
            name: 'Redmi Smartphone',
            prize_count: 10,
            site_url: 'https://xparisport.com/?promocode=senator',
            promo_code: 'SENATOR',
            id_pattern: /^150\d{3,12}$/, // iPhone bilan bir xil pattern
            id_min_length: 6, // iPhone bilan bir xil
            id_max_length: 15, // iPhone bilan bir xil
            description: '10 ta Redmi telefon sovg\'a qilinadi!',
            rules: [
                'Saytga ro\'yxatdan o\'ting',
                'Promokod: SENATOR',
                'ID raqamingizni oling'
            ]
        }
    },
    
    // Bot Behavior Configuration
    SETTINGS: {
        subscription_check_interval: 3600000, // 1 hour in milliseconds
        max_retries: 3,
        request_timeout: 10000,
        cache_duration: 300000, // 5 minutes
        max_users_per_day: 1000,
        max_requests_per_minute: 30,
        maintenance_mode: false,
        debug_mode: process.env.NODE_ENV === 'development'
    },
    
    // File Paths
    PATHS: {
        logs: './logs',
        backups: './backups',
        temp: './temp'
    }
};

// ============================
// 2. DATABASE MODELS
// ============================
const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true, index: true },
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, index: true, sparse: true },
    firstName: String,
    lastName: String,
    languageCode: String,
    
    subscribedChannels: [{
        channelId: String,
        channelName: String,
        subscribedAt: Date
    }],
    isSubscribed: { type: Boolean, default: false, index: true },
    subscriptionCheckedAt: Date,
    
    contests: {
        iphone: {
            participated: { type: Boolean, default: false },
            participantId: { type: String, sparse: true },
            participationDate: Date,
            verified: { type: Boolean, default: false },
            verificationDate: Date
        },
        redmi: {
            participated: { type: Boolean, default: false },
            participantId: { type: String, sparse: true },
            participationDate: Date,
            verified: { type: Boolean, default: false },
            verificationDate: Date
        }
    },
    
    participationCount: { type: Number, default: 0 },
    lastActivity: Date,
    
    ipAddress: String,
    userAgent: String,
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.virtual('fullName').get(function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.virtual('hasParticipatedIphone').get(function() {
    return this.contests?.iphone?.participated || false;
});

userSchema.virtual('hasParticipatedRedmi').get(function() {
    return this.contests?.redmi?.participated || false;
});

const User = mongoose.model('User', userSchema);

const winnerSchema = new mongoose.Schema({
    contestType: { type: String, enum: ['iphone', 'redmi'], required: true, index: true },
    userId: { type: Number, required: true, index: true },
    userInfo: {
        telegramId: Number,
        username: String,
        firstName: String,
        lastName: String
    },
    
    participantId: { type: String, required: true },
    prizeNumber: { type: Number, required: true },
    
    selectedBy: {
        adminId: Number,
        adminUsername: String
    },
    selectionMethod: { type: String, enum: ['random', 'manual', 'system'], default: 'random' },
    
    notified: { type: Boolean, default: false },
    notificationDate: Date,
    prizeSent: { type: Boolean, default: false },
    prizeSentDate: Date,
    confirmedByUser: { type: Boolean, default: false },
    confirmationDate: Date,
    
    verificationCode: String,
    verified: { type: Boolean, default: false },
    
    selectionNotes: String,
    
    selectedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const Winner = mongoose.model('Winner', winnerSchema);

const logSchema = new mongoose.Schema({
    level: { type: String, enum: ['error', 'warn', 'info', 'debug'], required: true, index: true },
    source: { type: String, enum: ['bot', 'admin', 'system', 'database', 'api'], required: true },
    action: { type: String, required: true, index: true },
    
    userId: Number,
    adminId: Number,
    contestType: String,
    
    message: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    errorStack: String,
    
    ipAddress: String,
    userAgent: String,
    
    createdAt: { type: Date, default: Date.now, index: true }
});

const Log = mongoose.model('Log', logSchema);

// ============================
// 3. UTILITY FUNCTIONS
// ============================
class Utils {
    static generateId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    static formatDate(date, format = 'full') {
        const d = new Date(date);
        const options = {
            full: {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            },
            date: {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            time: {
                hour: '2-digit',
                minute: '2-digit'
            }
        };
        
        return d.toLocaleDateString('uz-UZ', options[format] || options.full);
    }
    
    static validateId(id, contestType) {
        const contest = CONFIG.CONTESTS[contestType.toUpperCase()];
        
        if (!contest) {
            throw new Error(`❌ Konkurs konfiguratsiyasi topilmadi: ${contestType}`);
        }
        
        // ID ni tozalash
        id = id.toString().trim();
        
        // Bo'sh yoki undefined tekshirish
        if (!id || id === '') {
            throw new Error('❌ ID raqam kiritilmadi!');
        }
        
        // Faqat raqamlardan iboratligini tekshirish
        if (!/^\d+$/.test(id)) {
            throw new Error('❌ ID faqat raqamlardan iborat bo\'lishi kerak!');
        }
        
        // Uzunlik tekshirish
        if (id.length < contest.id_min_length || id.length > contest.id_max_length) {
            throw new Error(`❌ ID ${contest.id_min_length} dan ${contest.id_max_length} gacha raqamdan iborat bo'lishi kerak!`);
        }
        
        // 150 bilan boshlanishini tekshirish
        if (!id.startsWith('150')) {
            throw new Error('❌ ID raqam noto\'ri yoki eskirgan!');
        }
        
        // Pattern tekshirish
        if (!contest.id_pattern.test(id)) {
            throw new Error('❌ ID noto\'g\'ri formatda!\n📌');
        }
        
        return id;
    }
    
    static async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    
    static async logToFile(level, message, data = null) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}` + 
                           (data ? ` | ${JSON.stringify(data)}` : '') + '\n';
            
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(CONFIG.PATHS.logs, `${date}.log`);
            
            await fs.mkdir(CONFIG.PATHS.logs, { recursive: true });
            await fs.appendFile(logFile, logEntry);
        } catch (error) {
            console.error('Log yozishda xatolik:', error);
        }
    }
    
    static escapeMarkdown(text) {
        const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        for (const char of specialChars) {
            text = text.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
        }
        return text;
    }
}

// ============================
// 4. DATABASE SERVICE
// ============================
class DatabaseService {
    static async initialize() {
        try {
            console.log('🔗 MongoDB ga ulanmoqda...');
            
            await mongoose.connect(CONFIG.MONGODB_URI, CONFIG.MONGODB_OPTIONS);
            
            mongoose.connection.on('connected', () => {
                console.log('✅ MongoDB ga muvaffaqiyatli ulandik');
                Utils.logToFile('info', 'MongoDB connected successfully');
            });
            
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                Utils.logToFile('error', 'MongoDB connection error', { error: err.message });
            });
            
            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected');
                Utils.logToFile('warn', 'MongoDB disconnected');
            });
            
            process.on('SIGINT', async () => {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            });
            
            return mongoose.connection;
            
        } catch (error) {
            console.error('❌ MongoDB ga ulanib bo\'lmadi:', error);
            Utils.logToFile('error', 'MongoDB connection failed', { error: error.message });
            throw error;
        }
    }
    
    static async findOrCreateUser(ctx) {
        return await Utils.retryOperation(async () => {
            const { id, username, first_name, last_name, language_code } = ctx.from;
            
            try {
                let user = await User.findOne({ userId: id });
                
                if (!user) {
                    user = new User({
                        userId: id,
                        telegramId: id,
                        username: username,
                        firstName: first_name,
                        lastName: last_name,
                        languageCode: language_code,
                        ipAddress: ctx.ip,
                        userAgent: ctx.telegram?.update_id ? 'Telegram' : 'Web',
                        isSubscribed: false,
                        contests: {
                            iphone: { participated: false },
                            redmi: { participated: false }
                        },
                        lastActivity: new Date()
                    });
                    
                    await user.save();
                    
                    await Log.create({
                        level: 'info',
                        source: 'bot',
                        action: 'user_created',
                        userId: id,
                        message: 'Yangi foydalanuvchi yaratildi',
                        details: { username, firstName: first_name }
                    });
                    
                    console.log(`👤 Yangi foydalanuvchi: ${username || first_name} (${id})`);
                } else {
                    user.username = username;
                    user.firstName = first_name;
                    user.lastName = last_name;
                    user.lastActivity = new Date();
                    await user.save();
                }
                
                return user;
                
            } catch (error) {
                console.error('User yaratish/update qilishda xatolik:', error);
                throw error;
            }
        });
    }
    
    static async checkAndUpdateSubscription(bot, userId) {
        return await Utils.retryOperation(async () => {
            try {
                const user = await User.findOne({ userId });
                if (!user) {
                    return { isSubscribed: false, notSubscribed: CONFIG.REQUIRED_CHANNELS };
                }
                
                // Check cache (last 5 minutes)
                if (user.subscriptionCheckedAt && 
                    (Date.now() - user.subscriptionCheckedAt.getTime()) < CONFIG.SETTINGS.cache_duration &&
                    user.isSubscribed) {
                    return { isSubscribed: true, notSubscribed: [] };
                }
                
                const notSubscribed = [];
                const subscribedChannels = [];
                
                for (const channel of CONFIG.REQUIRED_CHANNELS) {
                    try {
                        const member = await bot.getChatMember(channel.id, userId);
                        const isMember = !(member.status === 'left' || member.status === 'kicked');
                        
                        if (isMember) {
                            subscribedChannels.push({
                                channelId: channel.id,
                                channelName: channel.name,
                                subscribedAt: new Date()
                            });
                        } else {
                            notSubscribed.push(channel);
                        }
                    } catch (error) {
                        console.error(`Kanalni tekshirishda xatolik (${channel.name}):`, error.message);
                        notSubscribed.push(channel);
                    }
                }
                
                const isSubscribed = notSubscribed.length === 0;
                
                user.isSubscribed = isSubscribed;
                user.subscribedChannels = subscribedChannels;
                user.subscriptionCheckedAt = new Date();
                user.lastActivity = new Date();
                
                await user.save();
                
                await Log.create({
                    level: 'info',
                    source: 'bot',
                    action: 'subscription_checked',
                    userId: userId,
                    message: 'Obuna holati tekshirildi',
                    details: { isSubscribed, channels: subscribedChannels.length }
                });
                
                return { isSubscribed, notSubscribed };
                
            } catch (error) {
                console.error('Obunani tekshirishda xatolik:', error);
                throw error;
            }
        });
    }
    
    static async checkBotChannelsAccess(bot) {
        console.log('🔍 Botning kanallarga kirish huquqi tekshirilmoqda...');
        
        for (const channel of CONFIG.REQUIRED_CHANNELS) {
            try {
                const chat = await bot.getChat(channel.id);
                console.log(`✅ ${channel.name}: ${chat.type} kanaliga kirish mavjud`);
            } catch (error) {
                console.error(`❌ ${channel.name} kanaliga kirishda xatolik:`, error.message);
                console.log(`⚠️ Botni ${channel.name} kanaliga ADMIN qilib qo'shing!`);
            }
        }
    }
    
    static async participateInContest(userId, contestType, participantId) {
        return await Utils.retryOperation(async () => {
            try {
                const user = await User.findOne({ userId });
                if (!user) {
                    throw new Error('Foydalanuvchi topilmadi');
                }
                
                // Check if already participated
                if (user.contests[contestType]?.participated) {
                    throw new Error('Siz allaqachon qatnashgansiz');
                }
                
                // Check ID uniqueness
                const existingUser = await User.findOne({
                    [`contests.${contestType}.participantId`]: participantId,
                    userId: { $ne: userId }
                });
                
                if (existingUser) {
                    throw new Error('Bu ID allaqachon boshqa foydalanuvchi tomonidan kiritilgan');
                }
                
                // Update user
                user.contests[contestType] = {
                    participated: true,
                    participantId: participantId,
                    participationDate: new Date(),
                    verified: false
                };
                
                user.participationCount += 1;
                user.lastActivity = new Date();
                
                await user.save();
                
                await Log.create({
                    level: 'info',
                    source: 'bot',
                    action: 'contest_participation',
                    userId: userId,
                    contestType: contestType,
                    message: 'Konkursga qatnashish',
                    details: { contestType, participantId }
                });
                
                console.log(`🎯 Foydalanuvchi ${userId} ${contestType} konkursiga qatnashdi`);
                
                return user;
                
            } catch (error) {
                console.error('Konkursga qatnashishda xatolik:', error);
                throw error;
            }
        });
    }
    
    static async selectWinner(contestType, adminId, adminUsername) {
        return await Utils.retryOperation(async () => {
            try {
                // Check existing winners count
                const existingWinnersCount = await Winner.countDocuments({ contestType });
                const maxWinners = CONFIG.CONTESTS[contestType.toUpperCase()].prize_count;
                
                if (existingWinnersCount >= maxWinners) {
                    throw new Error(`Barcha ${maxWinners} ta g'olib allaqachon aniqlangan`);
                }
                
                // Get participants who haven't won yet
                const existingWinners = await Winner.find({ contestType });
                const winnerUserIds = existingWinners.map(w => w.userId);
                
                const participants = await User.aggregate([
                    {
                        $match: {
                            [`contests.${contestType}.participated`]: true,
                            isSubscribed: true,
                            userId: { $nin: winnerUserIds },
                            isBlocked: false
                        }
                    },
                    { $sample: { size: 50 } }
                ]);
                
                if (participants.length === 0) {
                    throw new Error('G\'olib aniqlash uchun yangi ishtirokchilar yo\'q');
                }
                
                // Random selection
                const randomIndex = Math.floor(Math.random() * participants.length);
                const winner = participants[randomIndex];
                
                // Create winner record
                const winnerRecord = new Winner({
                    contestType: contestType,
                    userId: winner.userId,
                    userInfo: {
                        telegramId: winner.userId,
                        username: winner.username,
                        firstName: winner.firstName,
                        lastName: winner.lastName
                    },
                    participantId: winner.contests[contestType].participantId,
                    prizeNumber: existingWinnersCount + 1,
                    selectedBy: {
                        adminId: adminId,
                        adminUsername: adminUsername
                    },
                    selectionMethod: 'random',
                    verificationCode: Utils.generateId().substring(0, 8).toUpperCase(),
                    selectedAt: new Date()
                });
                
                await winnerRecord.save();
                
                await Log.create({
                    level: 'info',
                    source: 'admin',
                    action: 'winner_selected',
                    adminId: adminId,
                    contestType: contestType,
                    message: 'Yangi g\'olib aniqlandi',
                    details: {
                        winnerId: winner.userId,
                        contestType: contestType,
                        prizeNumber: existingWinnersCount + 1
                    }
                });
                
                console.log(`🏆 Yangi g\'olib: ${winner.username || winner.firstName} (${winner.userId})`);
                
                return winnerRecord;
                
            } catch (error) {
                console.error('G\'olibni aniqlashda xatolik:', error);
                throw error;
            }
        });
    }
    
    static async getStatistics() {
        try {
            const [
                totalUsers,
                subscribedUsers,
                iphoneParticipants,
                redmiParticipants,
                iphoneWinners,
                redmiWinners,
                todayUsers,
                activeUsers
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ isSubscribed: true }),
                User.countDocuments({ 'contests.iphone.participated': true, isSubscribed: true }),
                User.countDocuments({ 'contests.redmi.participated': true, isSubscribed: true }),
                Winner.countDocuments({ contestType: 'iphone' }),
                Winner.countDocuments({ contestType: 'redmi' }),
                User.countDocuments({
                    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                }),
                User.countDocuments({
                    lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
            ]);
            
            return {
                totalUsers,
                subscribedUsers,
                iphoneParticipants,
                redmiParticipants,
                iphoneWinners,
                redmiWinners,
                todayUsers,
                activeUsers,
                iphoneRemaining: CONFIG.CONTESTS.IPHONE.prize_count - iphoneWinners,
                redmiRemaining: CONFIG.CONTESTS.REDMI.prize_count - redmiWinners
            };
            
        } catch (error) {
            console.error('Statistika olishda xatolik:', error);
            throw error;
        }
    }
    
    static async getWinners(contestType) {
        try {
            return await Winner.find({ contestType })
                .sort({ selectedAt: -1 })
                .limit(50);
        } catch (error) {
            console.error('G\'oliblarni olishda xatolik:', error);
            throw error;
        }
    }
}

// ============================
// 5. BOT SCENES - SIFATLI TAYYORLANGAN
// ============================
class BotScenes {
    static createContestScene(contestType) {
        const contest = CONFIG.CONTESTS[contestType.toUpperCase()];
        
        const scene = new Scenes.BaseScene(contestType.toLowerCase());
        
        scene.enter(async (ctx) => {
            try {
                const userId = ctx.from.id;
                
                // User ni tekshirish
                const user = await DatabaseService.findOrCreateUser(ctx);
                
                // Obunani tekshirish
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (!subscription.isSubscribed) {
                    await ctx.reply(
                        '📢 *ILTIMOS, KANALLARGA OBUNA BO\'LING!*\n\n' +
                        'Botdan to\'liq foydalanish uchun quyidagi kanallarga obuna bo\'lishingiz kerak:',
                        { parse_mode: 'Markdown' }
                    );
                    await this.showChannelButtons(ctx, subscription.notSubscribed);
                    return ctx.scene.leave();
                }
                
                // Agar allaqachon qatnashgan bo'lsa
                const hasParticipated = contestType === 'IPHONE' ? 
                    user.hasParticipatedIphone : user.hasParticipatedRedmi;
                
                if (hasParticipated) {
                    const participantId = contestType === 'IPHONE' ? 
                        user.contests.iphone.participantId : user.contests.redmi.participantId;
                    
                    await ctx.reply(
                        'ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n' +
                        'Siz ushbu konkursga allaqachon qatnashgansiz.\n' +
                        '📝 Sizning ID raqamingiz: ' + (participantId || 'Noma\'lum'),
                        { parse_mode: 'Markdown' }
                    );
                    return ctx.scene.leave();
                }
                
                // Contest information - Markdown ni to'g'ri ishlatish
                const contestInfo = 
                    `📱 *${contest.name} KONKURSI*\n\n` +
                    `🎁 ${contest.description}\n\n` +
                    `🎯 *Qatnashish shartlari:*\n` +
                    contest.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n') + `\n\n` +
                    `🔗 *Sayt:* ${contest.site_url}\n` +
                    `🔑 *Promokod:* ${contest.promo_code}\n\n` +
                    `ID ni yuborish uchun quyidagi tugmani bosing:`;
                
                // Escape qilish kerak bo'lgan belgilar
                const escapedInfo = Utils.escapeMarkdown(contestInfo);
                
                await ctx.reply(
                    escapedInfo,
                    {
                        parse_mode: 'MarkdownV2',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ Qatnashish', `participate_${contestType.toLowerCase()}`)],
                            [Markup.button.callback('❌ Bekor qilish', `cancel_${contestType.toLowerCase()}`)]
                        ])
                    }
                );
                
            } catch (error) {
                console.error(`${contestType} scene enter error:`, error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
                ctx.scene.leave();
            }
        });
        
        // Qatnashish action
        scene.action(`participate_${contestType.toLowerCase()}`, async (ctx) => {
            try {
                await ctx.editMessageText(
                    Utils.escapeMarkdown(
                        '📝 *ID raqamingizni yuboring:*\n\n' +
                        'Iltimos, saytdan olingan ID raqamingizni yuboring.\n' +
                    ),
                    { 
                        parse_mode: 'MarkdownV2'
                    }
                );
                
                // Wait for ID input
                scene.on('text', async (ctx) => {
                    try {
                        const userId = ctx.from.id;
                        const participantId = ctx.message.text.trim();
                        
                        console.log(`${contestType} uchun ID kiritildi: ${participantId}`);
                        
                        // Validate ID
                        let validId;
                        try {
                            validId = Utils.validateId(participantId, contestType);
                            console.log(`ID validatsiyadan o'tdi: ${validId}`);
                        } catch (validationError) {
                            console.log(`Validatsiya xatosi: ${validationError.message}`);
                            
                            // ID 150 bilan boshlanmasa yoki noto'g'ri bo'lsa
                            if (!participantId.startsWith('150')) {
                                await ctx.reply(
                                    Utils.escapeMarkdown(
                                        '❌ *BU ID ESKIRGAN YOKI NOTO\'G\'RI!*\n\n' +
                                        'Iltimos, saytga qaytib ro\'yxatdan o\'ting va yangi ID oling!\n'
                                    ),
                                    { parse_mode: 'MarkdownV2' }
                                );
                            } else {
                                await ctx.reply(
                                    Utils.escapeMarkdown(
                                        '❌ *ID ESKIRGAN YOKI NOTO\'G\'RI!*\n\n' 
                                    ),
                                    { parse_mode: 'MarkdownV2' }
                                );
                            }
                            
                            // Scene ni qayta kiritish
                            return scene.enter(ctx);
                        }
                        
                        // Participate in contest
                        await DatabaseService.participateInContest(userId, contestType.toLowerCase(), validId);
                        
                        await ctx.reply(
                            Utils.escapeMarkdown(
                                '🎉 *TABRIKLAYMIZ!*\n\n' +
                                'Siz konkursga muvaffaqiyatli qatnashdingiz!\n' +
                                '📝 Sizning ID raqamingiz: ' + validId + '\n\n' +
                                '🏆 G\'oliblar adminlar tomonidan aniqlanadi va sizga xabar beriladi.\n' +
                                '🔔 Kutib turing, natijalar yaqin orada e\'lon qilinadi!'
                            ),
                            { parse_mode: 'MarkdownV2' }
                        );
                        
                        // Show main menu
                        await this.showMainMenu(ctx);
                        
                    } catch (error) {
                        console.error(`${contestType} ID qayta ishlash xatosi:`, error);
                        await ctx.reply(
                            Utils.escapeMarkdown(error.message),
                            { parse_mode: 'MarkdownV2' }
                        );
                        return scene.enter(ctx);
                    } finally {
                        ctx.scene.leave();
                    }
                });
                
                // Handle non-text messages
                scene.on('message', async (ctx) => {
                    if (ctx.message.text) return;
                    await ctx.reply(
                        '❌ Iltimos, faqat ID raqamini yuboring!\n' +
                        'ID raqam faqat raqamlardan iborat bo\'lishi kerak.',
                        { parse_mode: 'Markdown' }
                    );
                });
                
            } catch (error) {
                console.error(`${contestType} participation error:`, error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
                ctx.scene.leave();
            }
        });
        
        // Bekor qilish action
        scene.action(`cancel_${contestType.toLowerCase()}`, (ctx) => {
            ctx.reply('❌ Konkurs bekor qilindi.');
            ctx.scene.leave();
            this.showMainMenu(ctx);
        });
        
        return scene;
    }
    
    static createAdminScene() {
        const scene = new Scenes.BaseScene('admin');
        
        scene.enter(async (ctx) => {
            try {
                if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
                    return ctx.reply('❌ Siz admin emassiz!');
                }
                
                await ctx.reply(
                    '👨‍💻 *ADMIN PANEL*\n\n' +
                    'Botni boshqarish paneli. Quyidagi tugmalardan birini tanlang:',
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('📊 Statistika', 'admin_stats')],
                            // [Markup.button.callback('📱 iPhone g\'oliblari', 'admin_iphone_winners')],
                            // [Markup.button.callback('📱 Redmi g\'oliblari', 'admin_redmi_winners')],
                            // [Markup.button.callback('🎯 iPhone g\'olibini aniqlash', 'select_iphone_winner')],
                            // [Markup.button.callback('🎯 Redmi g\'olibini aniqlash', 'select_redmi_winner')],
                            // [Markup.button.callback('🔄 Yangilash', 'admin_refresh')],
                            // [Markup.button.callback('📤 Chiqish', 'exit_admin')]
                        ])
                    }
                );
                
            } catch (error) {
                console.error('Admin scene enter error:', error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
                ctx.scene.leave();
            }
        });
        
        // Admin actions
        scene.action('admin_stats', async (ctx) => {
            try {
                const stats = await DatabaseService.getStatistics();
                
                await ctx.editMessageText(
                    `📊 *BOT STATISTIKASI*\n\n` +
                    `👥 *Jami foydalanuvchilar:* ${stats.totalUsers}\n` +
                    `📈 *Bugun qo\'shilgan:* ${stats.todayUsers}\n` +
                    `🔥 *Faol foydalanuvchilar:* ${stats.activeUsers}\n` +
                    `✅ *Obuna bo\'lganlar:* ${stats.subscribedUsers}\n\n` +
                    `📱 *iPhone ishtirokchilar:* ${stats.iphoneParticipants}\n` +
                    `📱 *Redmi ishtirokchilar:* ${stats.redmiParticipants}\n\n` +
                    // `🏆 *iPhone g\'oliblari:* ${stats.iphoneWinners}/${CONFIG.CONTESTS.IPHONE.prize_count}\n` +
                    // `🏆 *Redmi g\'oliblari:* ${stats.redmiWinners}/${CONFIG.CONTESTS.REDMI.prize_count}\n\n` +
                    // `🕒 *Oxirgi yangilanish:* ${Utils.formatDate(new Date(), 'time')}`,
                    { parse_mode: 'Markdown' }
                );
                
            } catch (error) {
                console.error('Admin stats error:', error);
                await ctx.answerCbQuery('❌ Statistika olishda xatolik!');
            }
            ctx.answerCbQuery();
        });
        
        // ... Admin scene qolgan qismlari (oldingi kodda bor)
        
        return scene;
    }
    
    static async showMainMenu(ctx) {
        try {
            await ctx.reply(
                '🏠 *ASOSIY MENYU*\n\n' +
                'Quyidagi menyudan kerakli amalni tanlang:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        ['📋 Konkurs haqida'],
                        ['📱 iPhone 17 Pro Max'],
                        ['📱 Redmi']
                    ])
                    .resize()
                    .oneTime()
                }
            );
        } catch (error) {
            console.error('Main menu error:', error);
        }
    }
    
    static async showChannelButtons(ctx, channels) {
        try {
            const buttons = channels.map(channel => 
                [Markup.button.url(`📢 ${channel.name}`, channel.url)]
            );
            
            buttons.push([Markup.button.callback('✅ Obunani tekshirish', 'check_subscription')]);
            
            await ctx.reply(
                'Obuna bo\'lish uchun quyidagi tugmalardan foydalaning:',
                Markup.inlineKeyboard(buttons)
            );
        } catch (error) {
            console.error('Channel buttons error:', error);
        }
    }
}

// ============================
// 6. BOT MAIN CLASS
// ============================
class SenatorBot {
    constructor() {
        this.bot = new Telegraf(CONFIG.BOT_TOKEN);
        this.scenes = [];
        this.stage = null;
        this.initialized = false;
    }
    
    async initialize() {
        try {
            console.log('🚀 Bot ishga tushirilmoqda...');
            
            // Create directories
            await this.createDirectories();
            
            // Initialize database
            await DatabaseService.initialize();
            
            // Create scenes
            const iphoneScene = BotScenes.createContestScene('IPHONE');
            const redmiScene = BotScenes.createContestScene('REDMI');
            const adminScene = BotScenes.createAdminScene();
            
            this.scenes = [iphoneScene, redmiScene, adminScene];
            this.stage = new Scenes.Stage(this.scenes);
            
            // Setup middleware
            this.bot.use(session());
            this.bot.use(this.stage.middleware());
            
            // Setup error handling middleware
            this.bot.use(async (ctx, next) => {
                try {
                    await next();
                } catch (error) {
                    console.error('Bot error:', error);
                    try {
                        await ctx.reply(
                            '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                            { parse_mode: 'Markdown' }
                        );
                    } catch (e) {
                        console.error('Error reply failed:', e);
                    }
                }
            });
            
            // Setup user middleware
            this.bot.use(async (ctx, next) => {
                if (ctx.message && ctx.message.text) {
                    await DatabaseService.findOrCreateUser(ctx);
                }
                await next();
            });
            
            // Register commands
            this.registerCommands();
            
            // Register actions
            this.registerActions();
            
            this.initialized = true;
            console.log('✅ Bot muvaffaqiyatli ishga tushirildi!');
            
        } catch (error) {
            console.error('❌ Botni ishga tushirishda xatolik:', error);
            throw error;
        }
    }
    
    async createDirectories() {
        try {
            for (const path of Object.values(CONFIG.PATHS)) {
                await fs.mkdir(path, { recursive: true });
            }
            console.log('📁 Papkalar yaratildi');
        } catch (error) {
            console.error('Papkalar yaratishda xatolik:', error);
        }
    }
    
    registerCommands() {
        // Start command
        this.bot.start(async (ctx) => {
            try {
                const userId = ctx.from.id;
                
                // Check subscription
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (subscription.notSubscribed.length > 0) {
                    await ctx.reply(
                        '🎉 *SENATOR KONKURS BOTIGA XUSH KELIBSIZ!*\n\n' +
                        'Bu bot orqali siz quyidagi sovg\'alarni yutib olishingiz mumkin:\n' +
                        '🏆 5 ta iPhone 17 Pro Max\n' +
                        '🏆 10 ta Redmi telefon\n\n' +
                        'Botdan foydalanish uchun avval quyidagi kanallarga obuna bo\'ling:',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                } else {
                    await ctx.reply(
                        '✅ *BARCHA KANALLARGA OBUNA BO\'LGANSIZ!*\n\n' +
                        'Endi konkurslarda qatnashishingiz mumkin.\n' +
                        'Quyidagi menyudan kerakli konkursni tanlang:',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showMainMenu(ctx);
                }
                
            } catch (error) {
                console.error('Start command error:', error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
            }
        });
        
        // Admin command
        this.bot.command('admin', async (ctx) => {
            if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.reply('❌ Siz admin emassiz!');
            }
            ctx.scene.enter('admin');
        });
        
        // Help command
        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '🏆 *KONKURS HAQIDA MA\'LUMOT*\n\n' +
                '🎁 *Sovg\'alar:*\n' +
                '• 5 ta iPhone 17 Pro Max\n' +
                '• 10 ta Redmi telefon\n\n' +
                '📱 *iPhone 17 Pro Max yutish uchun:*\n' +
                '1. Saytga kirish\n' +
                '2. Promokod: SENATOR\n' +
                '3. Ro\'yxatdan o\'tish\n' +
                '4. ID ni yuborish\n\n' +
                '📱 *Redmi yutish uchun:*\n' +
                '1. Saytga kirish\n' +
                '2. Promokod: SENATOR\n' +
                '3. Ro\'yxatdan o\'tish\n' +
                '4. ID ni yuborish\n\n' +
                '🚀 *Har bir foydalanuvchi faqat bir marta qatnashishi mumkin!*',
                { parse_mode: 'Markdown' }
            );
        });
    }
    
    registerActions() {
        // Check subscription action
        this.bot.action('check_subscription', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (subscription.notSubscribed.length > 0) {
                    await ctx.editMessageText(
                        '📢 *ILTIMOS, KANALLARGA OBUNA BO\'LING!*\n\n' +
                        'Botdan to\'liq foydalanish uchun quyidagi kanallarga obuna bo\'lishingiz kerak:',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                } else {
                    await ctx.editMessageText(
                        '✅ *BARCHA KANALLARGA OBUNA BO\'LGANSIZ!*\n\n' +
                        'Endi konkurslarda qatnashishingiz mumkin.\n' +
                        'Quyidagi menyudan kerakli konkursni tanlang:',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showMainMenu(ctx);
                }
                
            } catch (error) {
                console.error('Check subscription error:', error);
                await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
            }
            ctx.answerCbQuery();
        });
        
        // Contest info
        this.bot.hears('📋 Konkurs haqida', async (ctx) => {
            await ctx.reply(
                '🏆 *KONKURS HAQIDA MA\'LUMOT*\n\n' +
                '🎁 *Sovg\'alar:*\n' +
                '• 5 ta iPhone 17 Pro Max\n' +
                '• 10 ta Redmi telefon\n\n' +
                '📱 *iPhone 17 Pro Max yutish uchun:*\n' +
                '1. Saytga kirish\n' +
                '2. Promokod: SENATOR\n' +
                '3. Ro\'yxatdan o\'tish\n' +
                '4. ID ni yuborish\n\n' +
                '📱 *Redmi yutish uchun:*\n' +
                '1. Saytga kirish\n' +
                '2. Promokod: SENATOR\n' +
                '3. Ro\'yxatdan o\'tish\n' +
                '4. ID ni yuborish\n\n' +
                '🚀 *Har bir foydalanuvchi faqat bir marta qatnashishi mumkin!*',
                { parse_mode: 'Markdown' }
            );
        });
        
        // iPhone contest
        this.bot.hears('📱 iPhone 17 Pro Max', async (ctx) => {
            const userId = ctx.from.id;
            
            try {
                const user = await User.findOne({ userId });
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (!subscription.isSubscribed) {
                    await ctx.reply(
                        '❌ Avval barcha kanallarga obuna bo\'ling!',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                    return;
                }
                
                if (user && user.hasParticipatedIphone) {
                    await ctx.reply(
                        'ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n' +
                        'Siz ushbu konkursga allaqachon qatnashgansiz.\n' +
                        '📝 Sizning ID raqamingiz: ' + (user.contests.iphone.participantId || 'Noma\'lum'),
                        { parse_mode: 'Markdown' }
                    );
                    return;
                }
                
                ctx.scene.enter('iphone');
                
            } catch (error) {
                console.error('iPhone contest error:', error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
            }
        });
        
        // Redmi contest
        this.bot.hears('📱 Redmi', async (ctx) => {
            const userId = ctx.from.id;
            
            try {
                const user = await User.findOne({ userId });
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (!subscription.isSubscribed) {
                    await ctx.reply(
                        '❌ Avval barcha kanallarga obuna bo\'ling!',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                    return;
                }
                
                if (user && user.hasParticipatedRedmi) {
                    await ctx.reply(
                        'ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n' +
                        'Siz ushbu konkursga allaqachon qatnashgansiz.\n' +
                        '📝 Sizning ID raqamingiz: ' + (user.contests.redmi.participantId || 'Noma\'lum'),
                        { parse_mode: 'Markdown' }
                    );
                    return;
                }
                
                ctx.scene.enter('redmi');
                
            } catch (error) {
                console.error('Redmi contest error:', error);
                await ctx.reply(
                    '⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
            }
        });
    }
    
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            await this.bot.launch({
                dropPendingUpdates: true,
                allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member']
            });
            
            const botInfo = await this.bot.telegram.getMe();
            console.log(`🤖 Bot: @${botInfo.username}`);
            
            // Botning kanallarga kirishini tekshirish
            await DatabaseService.checkBotChannelsAccess(this.bot.telegram);
            
            console.log(`👑 Adminlar: ${CONFIG.ADMIN_IDS.join(', ')}`);
            console.log(`📊 Kanallar: ${CONFIG.REQUIRED_CHANNELS.length} ta`);
            console.log(`📱 Sovg\'alar: ${CONFIG.CONTESTS.IPHONE.prize_count} iPhone, ${CONFIG.CONTESTS.REDMI.prize_count} Redmi`);
            console.log('🚀 Bot faol va ishlamoqda...');
            
        } catch (error) {
            console.error('❌ Botni ishga tushirishda xatolik:', error);
            throw error;
        }
    }
    
    async stop() {
        try {
            await this.bot.stop();
            await mongoose.connection.close();
            console.log('👋 Bot to\'xtatildi');
        } catch (error) {
            console.error('Botni to\'xtatishda xatolik:', error);
        }
    }
}

// ============================
// 7. MAIN EXECUTION
// ============================
async function main() {
    try {
        const bot = new SenatorBot();
        
        // Handle graceful shutdown
        process.once('SIGINT', () => bot.stop());
        process.once('SIGTERM', () => bot.stop());
        
        // Start the bot
        await bot.start();
        
    } catch (error) {
        console.error('❌ Botni ishga tushirishda og\'ir xatolik:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    main();
}

// Export for testing
module.exports = {
    SenatorBot,
    DatabaseService,
    Utils,
    CONFIG,
    User,
    Winner,
    Log
};