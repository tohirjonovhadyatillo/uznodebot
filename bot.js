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
    BOT_TOKEN: process.env.BOT_TOKEN,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_OPTIONS: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1
    },
    ADMIN_IDS: process.env.ADMIN_IDS ? 
        process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [],
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
            invite_link: 'https://t.me/+4byxN4zF6vJhNDZi',
            requires_admin: true
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
            invite_link: 'https://t.me/+0IhgHgHljec1M2Zi',
            requires_admin: true
        },
        {
            id: '@SENATORKUPON',
            name: 'SENATOR KUPON',
            url: 'https://t.me/SENATORKUPON',
            type: 'public',
            username: '@SENATORKUPON'
        }
    ],
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
            ],
            button_text: '📱 iPhone 17 Pro Max',
            emoji: '📱'
        },
        REDMI: {
            name: 'Redmi Smartphone',
            prize_count: 10,
            site_url: 'https://xparisport.com/?promocode=senator',
            promo_code: 'SENATOR',
            id_pattern: /^150\d{3,12}$/,
            id_min_length: 6,
            id_max_length: 15,
            description: '10 ta Redmi telefon sovg\'a qilinadi!',
            rules: [
                'Saytga ro\'yxatdan o\'ting',
                'Promokod: SENATOR',
                'ID raqamingizni oling'
            ],
            button_text: '📱 Redmi',
            emoji: '📱'
        },
        GENTRA: {
            name: 'Chevrolet Gentra',
            prize_count: 1,
            site_url: 'https://qbaff.com/L?tag=s_4361464m_94905c_&site=4361464&ad=94905&r=uz/registration',
            promo_code: 'SENATOR',
            id_pattern: /^GENTRA\d{5,10}$/,
            id_min_length: 6,
            id_max_length: 15,
            description: '1 ta Chevrolet Gentra avtomobil sovg\'a qilinadi!',
            rules: [
                'Saytga ro\'yxatdan o\'ting',
                'Promokod: SENATOR',
                'Avtomobil uchun ariza to\'ldiring',
                'ID raqamingizni oling'
            ],
            button_text: '🚗 Chevrolet Gentra',
            emoji: '🚗'
        }
    },
    SETTINGS: {
        subscription_check_interval: 300000,
        max_retries: 3,
        request_timeout: 10000,
        cache_duration: 600000,
        max_users_per_day: 1000,
        max_requests_per_minute: 20,
        maintenance_mode: false,
        debug_mode: process.env.NODE_ENV === 'development'
    },
    PATHS: {
        logs: './logs',
        backups: './backups',
        temp: './temp'
    }
};

// Validation
if (!CONFIG.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN .env faylida topilmadi!');
    process.exit(1);
}
if (!CONFIG.MONGODB_URI) {
    console.error('❌ MONGODB_URI .env faylida topilmadi!');
    process.exit(1);
}

// ============================
// 2. DATABASE MODELS
// ============================
const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, index: true, sparse: true },
    firstName: String,
    lastName: String,
    subscribedChannels: [{
        channelId: String,
        channelName: String,
        subscribedAt: Date,
        isAdmin: { type: Boolean, default: false }
    }],
    isSubscribed: { type: Boolean, default: false, index: true },
    subscriptionCheckedAt: Date,
    contests: {
        iphone: {
            participated: { type: Boolean, default: false },
            participantId: { type: String, sparse: true },
            participationDate: Date
        },
        redmi: {
            participated: { type: Boolean, default: false },
            participantId: { type: String, sparse: true },
            participationDate: Date
        },
        gentra: {
            participated: { type: Boolean, default: false },
            participantId: { type: String, sparse: true },
            participationDate: Date
        }
    },
    participationCount: { type: Number, default: 0 },
    lastActivity: Date,
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

const notificationSchema = new mongoose.Schema({
    adminId: { type: Number, required: true },
    adminUsername: String,
    messageType: String,
    message: { type: String, required: true },
    caption: String,
    mediaId: String,
    totalSent: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    filters: mongoose.Schema.Types.Mixed,
    sentAt: Date,
    completedAt: Date,
    status: { 
        type: String, 
        enum: ['sending', 'completed', 'failed'], 
        default: 'sending' 
    },
    createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
const Notification = mongoose.model('Notification', notificationSchema);

// ============================
// 3. UTILITY FUNCTIONS
// ============================
class Utils {
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
    
    static async sendMessageWithRetry(bot, chatId, content) {
        try {
            if (content.type === 'photo') {
                return await bot.telegram.sendPhoto(chatId, content.mediaId, {
                    caption: content.caption,
                    parse_mode: 'Markdown',
                    ...content.reply_markup
                });
            } else if (content.type === 'video') {
                return await bot.telegram.sendVideo(chatId, content.mediaId, {
                    caption: content.caption,
                    parse_mode: 'Markdown',
                    ...content.reply_markup
                });
            } else if (content.type === 'animation') {
                return await bot.telegram.sendAnimation(chatId, content.mediaId, {
                    caption: content.caption,
                    parse_mode: 'Markdown',
                    ...content.reply_markup
                });
            } else if (content.type === 'document') {
                return await bot.telegram.sendDocument(chatId, content.mediaId, {
                    caption: content.caption,
                    parse_mode: 'Markdown',
                    ...content.reply_markup
                });
            } else if (content.type === 'voice') {
                return await bot.telegram.sendVoice(chatId, content.mediaId, {
                    caption: content.caption,
                    parse_mode: 'Markdown',
                    ...content.reply_markup
                });
            } else {
                return await bot.telegram.sendMessage(chatId, content.message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    ...content.reply_markup
                });
            }
        } catch (error) {
            if (error.response?.error_code === 429) {
                const retryAfter = error.response.parameters?.retry_after || 2;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return await this.sendMessageWithRetry(bot, chatId, content);
            }
            throw error;
        }
    }
    
    static formatTime() {
        return new Date().toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    static validateId(id, contestType) {
        const contest = CONFIG.CONTESTS[contestType.toUpperCase()];
        if (!contest) throw new Error('❌ Konkurs konfiguratsiyasi topilmadi!');
        
        id = id.toString().trim().toUpperCase();
        if (!id) throw new Error('❌ ID raqam kiritilmadi!');
        
        if (contestType.toUpperCase() === 'GENTRA') {
            if (!id.startsWith('GENTRA')) throw new Error('❌ ID "GENTRA" bilan boshlanishi kerak!');
            const numberPart = id.substring(6);
            if (!/^\d+$/.test(numberPart)) throw new Error('❌ ID raqam qismi faqat raqamlardan iborat bo\'lishi kerak!');
            if (id.length < contest.id_min_length || id.length > contest.id_max_length) {
                throw new Error(`❌ ID ${contest.id_min_length} dan ${contest.id_max_length} gacha belgidan iborat bo'lishi kerak!`);
            }
            return id;
        }
        
        if (!/^\d+$/.test(id)) throw new Error('❌ ID faqat raqamlardan iborat bo\'lishi kerak!');
        if (id.length < contest.id_min_length || id.length > contest.id_max_length) {
            throw new Error(`❌ ID ${contest.id_min_length} dan ${contest.id_max_length} gacha raqamdan iborat bo'lishi kerak!`);
        }
        if (!id.startsWith('150')) throw new Error('❌ ID raqam noto\'ri yoki eskirgan!');
        if (!contest.id_pattern.test(id)) throw new Error('❌ ID noto\'g\'ri formatda!');
        
        return id;
    }
    
    static extractContentFromMessage(message) {
        if (message.photo) {
            return {
                type: 'photo',
                mediaId: message.photo[message.photo.length - 1].file_id,
                caption: message.caption || '',
                reply_markup: message.reply_markup
            };
        } else if (message.video) {
            return {
                type: 'video',
                mediaId: message.video.file_id,
                caption: message.caption || '',
                reply_markup: message.reply_markup
            };
        } else if (message.animation) {
            return {
                type: 'animation',
                mediaId: message.animation.file_id,
                caption: message.caption || '',
                reply_markup: message.reply_markup
            };
        } else if (message.document) {
            return {
                type: 'document',
                mediaId: message.document.file_id,
                caption: message.caption || '',
                reply_markup: message.reply_markup
            };
        } else if (message.voice) {
            return {
                type: 'voice',
                mediaId: message.voice.file_id,
                caption: message.caption || '',
                reply_markup: message.reply_markup
            };
        } else if (message.text) {
            return {
                type: 'text',
                message: message.text,
                reply_markup: message.reply_markup
            };
        }
        return null;
    }
    
    static async safeEditMessageText(ctx, text, options = {}) {
        try {
            return await ctx.editMessageText(text, options);
        } catch (error) {
            if (error.description?.includes('message is not modified')) return null;
            throw error;
        }
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
            console.log('✅ MongoDB ga muvaffaqiyatli ulandik');
            return mongoose.connection;
        } catch (error) {
            console.error('❌ MongoDB ga ulanib bo\'lmadi:', error);
            throw error;
        }
    }
    
    static async findOrCreateUser(ctx) {
        const { id, username, first_name, last_name } = ctx.from;
        
        try {
            const user = await User.findOneAndUpdate(
                { userId: id },
                {
                    $setOnInsert: {
                        userId: id,
                        username: username,
                        firstName: first_name,
                        lastName: last_name,
                        isSubscribed: false,
                        contests: {
                            iphone: { participated: false },
                            redmi: { participated: false },
                            gentra: { participated: false }
                        },
                        lastActivity: new Date()
                    },
                    $set: {
                        username: username,
                        firstName: first_name,
                        lastName: last_name,
                        lastActivity: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            
            return user;
        } catch (error) {
            console.error('User yaratish/update qilishda xatolik:', error);
            throw error;
        }
    }
    
    static async checkAndUpdateSubscription(bot, userId) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return { isSubscribed: false, notSubscribed: CONFIG.REQUIRED_CHANNELS };
            
            if (user.subscriptionCheckedAt && 
                (Date.now() - user.subscriptionCheckedAt.getTime()) < CONFIG.SETTINGS.cache_duration &&
                user.isSubscribed) {
                return { isSubscribed: true, notSubscribed: [] };
            }
            
            const notSubscribed = [];
            const subscribedChannels = [];
            
            for (const channel of CONFIG.REQUIRED_CHANNELS) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    let isMember = false;
                    let isAdmin = false;
                    
                    try {
                        const member = await bot.getChatMember(channel.id, userId);
                        isMember = !(member.status === 'left' || member.status === 'kicked');
                        
                        if (channel.requires_admin) {
                            isAdmin = member.status === 'administrator' || member.status === 'creator';
                            isMember = isAdmin;
                        }
                    } catch (error) {
                        console.log(`Kanalni tekshirishda xatolik (${channel.name}):`, error.message);
                    }
                    
                    if (isMember) {
                        subscribedChannels.push({
                            channelId: channel.id,
                            channelName: channel.name,
                            subscribedAt: new Date(),
                            isAdmin: isAdmin
                        });
                    } else {
                        notSubscribed.push({
                            ...channel,
                            requiresAdmin: channel.requires_admin
                        });
                    }
                } catch (error) {
                    console.error(`Kanalni tekshirishda xatolik (${channel.name}):`, error.message);
                    notSubscribed.push(channel);
                }
            }
            
            const isSubscribed = notSubscribed.length === 0;
            
            await User.updateOne(
                { userId: userId },
                {
                    $set: {
                        isSubscribed: isSubscribed,
                        subscribedChannels: subscribedChannels,
                        subscriptionCheckedAt: new Date(),
                        lastActivity: new Date()
                    }
                }
            );
            
            return { isSubscribed, notSubscribed };
        } catch (error) {
            console.error('Obunani tekshirishda xatolik:', error);
            throw error;
        }
    }
    
    static async participateInContest(userId, contestType, participantId) {
        try {
            const existingUser = await User.findOne({
                [`contests.${contestType}.participantId`]: participantId,
                userId: { $ne: userId }
            });
            
            if (existingUser) {
                throw new Error('Bu ID allaqachon boshqa foydalanuvchi tomonidan kiritilgan');
            }
            
            const result = await User.updateOne(
                {
                    userId: userId,
                    [`contests.${contestType}.participated`]: { $ne: true }
                },
                {
                    $set: {
                        [`contests.${contestType}`]: {
                            participated: true,
                            participantId: participantId,
                            participationDate: new Date()
                        },
                        lastActivity: new Date()
                    },
                    $inc: { participationCount: 1 }
                }
            );
            
            if (result.nModified === 0) {
                throw new Error('Siz allaqachon qatnashgansiz yoki foydalanuvchi topilmadi');
            }
            
            console.log(`🎯 Foydalanuvchi ${userId} ${contestType} konkursiga qatnashdi`);
            return await User.findOne({ userId });
        } catch (error) {
            console.error('Konkursga qatnashishda xatolik:', error);
            throw error;
        }
    }
    
    static async handleUserLeftChannel(bot, channelId, userId) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return null;
            
            await User.updateOne(
                { userId: userId },
                { $pull: { subscribedChannels: { channelId: channelId } } }
            );
            
            const channel = CONFIG.REQUIRED_CHANNELS.find(c => c.id === channelId);
            if (channel) {
                const subscription = await this.checkAndUpdateSubscription(bot, userId);
                
                if (!subscription.isSubscribed) {
                    await User.updateOne(
                        { userId: userId },
                        { $set: { isSubscribed: false } }
                    );
                    
                    return {
                        shouldNotify: true,
                        channelName: channel.name,
                        user
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Kanal chiqishini qayta ishlashda xatolik:', error);
            return null;
        }
    }
    
    static async getStatistics() {
        try {
            const totalUsers = await User.countDocuments();
            const subscribedUsers = await User.countDocuments({ isSubscribed: true });
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const todayUsers = await User.countDocuments({
                createdAt: { $gte: today, $lt: tomorrow }
            });
            
            const activeUsers = await User.countDocuments({
                lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });
            
            const blockedUsers = await User.countDocuments({ isBlocked: true });
            
            return {
                totalUsers,
                subscribedUsers,
                todayUsers,
                activeUsers,
                blockedUsers
            };
        } catch (error) {
            console.error('Statistika olishda xatolik:', error);
            throw error;
        }
    }
    
    static async getUsersCount(filters = {}) {
        try {
            const query = {};
            
            if (filters.subscribed !== undefined) {
                query.isSubscribed = filters.subscribed;
            }
            
            if (filters.participatedIn) {
                query[`contests.${filters.participatedIn}.participated`] = true;
            }
            
            if (filters.isBlocked !== undefined) {
                query.isBlocked = filters.isBlocked;
            }
            
            const count = await User.countDocuments(query);
            return count;
        } catch (error) {
            console.error('Foydalanuvchilar sonini olishda xatolik:', error);
            throw error;
        }
    }
    
    static async broadcastMessage(bot, content, filters = {}) {
        let notification = null;
        
        try {
            // Build query
            const query = {};
            if (filters.subscribed !== undefined) {
                query.isSubscribed = filters.subscribed;
            }
            
            if (filters.participatedIn) {
                query[`contests.${filters.participatedIn}.participated`] = true;
            }
            
            // Get total count before sending
            const totalUsers = await User.countDocuments(query);
            
            // Create notification record
            notification = new Notification({
                adminId: filters.adminId || 0,
                adminUsername: filters.adminUsername || 'system',
                messageType: content.type || 'text',
                message: content.message || content.caption || '[Media Content]',
                caption: content.caption,
                mediaId: content.mediaId,
                filters: filters,
                totalSent: 0,
                successful: 0,
                failed: 0,
                status: 'sending',
                sentAt: new Date()
            });
            
            await notification.save();
            
            // Get users with limit for memory efficiency
            let successful = 0;
            let failed = 0;
            const batchSize = 5;
            let processed = 0;
            
            // Stream users in batches
            while (processed < totalUsers) {
                const users = await User.find(query)
                    .select('userId isBlocked')
                    .skip(processed)
                    .limit(batchSize)
                    .lean();
                
                if (users.length === 0) break;
                
                for (const user of users) {
                    if (user.isBlocked) {
                        failed++;
                        processed++;
                        continue;
                    }
                    
                    try {
                        await Utils.sendMessageWithRetry(bot, user.userId, content);
                        successful++;
                    } catch (error) {
                        failed++;
                        
                        // Blocked user detection
                        const errorMsg = (error.description || error.message || '').toLowerCase();
                        if (errorMsg.includes('blocked') || errorMsg.includes('forbidden') || 
                            (error.response && error.response.error_code === 403)) {
                            await User.updateOne(
                                { userId: user.userId },
                                { $set: { isBlocked: true, isActive: false } }
                            ).catch(() => {});
                        }
                    }
                    
                    processed++;
                    
                    // Update progress every 10 users
                    if (processed % 10 === 0 || processed === totalUsers) {
                        notification.totalSent = processed;
                        notification.successful = successful;
                        notification.failed = failed;
                        await notification.save();
                    }
                }
                
                // Delay between batches
                if (processed < totalUsers) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            
            // Complete notification
            notification.status = 'completed';
            notification.completedAt = new Date();
            await notification.save();
            
            console.log(`✅ Xabar yuborish yakunlandi: ${successful}/${totalUsers} muvaffaqiyatli`);
            
            return {
                total: totalUsers,
                successful,
                failed
            };
        } catch (error) {
            console.error('Xabar yuborishda xatolik:', error);
            
            if (notification) {
                notification.status = 'failed';
                await notification.save().catch(() => {});
            }
            
            throw error;
        }
    }
}

// ============================
// 5. BOT SCENES
// ============================
class BotScenes {
    static createContestScene(contestType) {
        const contest = CONFIG.CONTESTS[contestType.toUpperCase()];
        const scene = new Scenes.BaseScene(contestType.toLowerCase());
        
        scene.enter(async (ctx) => {
            try {
                const userId = ctx.from.id;
                const user = await DatabaseService.findOrCreateUser(ctx);
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
                
                if (user.contests[contestType.toLowerCase()]?.participated) {
                    const participantId = user.contests[contestType.toLowerCase()]?.participantId;
                    await ctx.reply(
                        'ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n' +
                        'Siz ushbu konkursga allaqachon qatnashgansiz.\n' +
                        `📝 Sizning ID raqamingiz: ${participantId || 'Noma\'lum'}`,
                        { parse_mode: 'Markdown' }
                    );
                    return ctx.scene.leave();
                }
                
                const contestInfo = 
                    `${contest.emoji} *${contest.name} KONKURSI*\n\n` +
                    `🎁 ${contest.description}\n\n` +
                    `🎯 *Qatnashish shartlari:*\n` +
                    contest.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n') + `\n\n` +
                    `🔗 *Sayt:* ${contest.site_url}\n` +
                    `🔑 *Promokod:* \`${contest.promo_code}\`\n\n` +
                    `ID ni yuborish uchun quyidagi tugmani bosing:`;
                
                await ctx.reply(
                    contestInfo,
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ Qatnashish', `participate_${contestType.toLowerCase()}`)],
                            [Markup.button.callback('❌ Bekor qilish', `cancel_${contestType.toLowerCase()}`)]
                        ])
                    }
                );
            } catch (error) {
                console.error(`${contestType} scene enter error:`, error);
                await ctx.reply('⚠️ Botda vaqtinchalik xatolik yuz berdi.');
                ctx.scene.leave();
            }
        });
        
        scene.action(`participate_${contestType.toLowerCase()}`, async (ctx) => {
            try {
                await ctx.answerCbQuery();
                await Utils.safeEditMessageText(
                    ctx,
                    '📝 *ID raqamingizni yuboring:*\n\n' +
                    'Iltimos, saytdan olingan ID raqamingizni yuboring.\n' +
                    (contestType.toUpperCase() === 'GENTRA' ? 
                     'ID "GENTRA" bilan boshlanadi, masalan: GENTRA12345\n\n' :
                     'ID "150" bilan boshlanadi, masalan: 150123456\n\n') +
                    '*Eslatma:* ID ni to\'g\'ri kiriting, keyinchalik o\'zgartirib bo\'lmaydi!',
                    { parse_mode: 'Markdown' }
                );
                
                // Set state to wait for ID
                ctx.scene.state.waitingForId = true;
            } catch (error) {
                console.error(`${contestType} participation error:`, error);
                await ctx.reply('⚠️ Xatolik yuz berdi.');
            }
        });
        
        scene.on('text', async (ctx) => {
            if (!ctx.scene.state.waitingForId) return;
            
            try {
                const userId = ctx.from.id;
                const participantId = ctx.message.text.trim();
                
                const validId = Utils.validateId(participantId, contestType);
                await DatabaseService.participateInContest(userId, contestType.toLowerCase(), validId);
                
                await ctx.reply(
                    '🎉 *TABRIKLAYMIZ!*\n\n' +
                    'Siz konkursga muvaffaqiyatli qatnashdingiz!\n' +
                    `📝 Sizning ID raqamingiz: \`${validId}\`\n\n` +
                    '🏆 G\'oliblar adminlar tomonidan aniqlanadi.\n' +
                    '🔔 Kutib turing, natijalar yaqin orada e\'lon qilinadi!\n\n' +
                    '⚠️ *Diqqat:* Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!',
                    { parse_mode: 'Markdown' }
                );
                
                ctx.scene.state.waitingForId = false;
                ctx.scene.leave();
                await this.showMainMenu(ctx);
            } catch (error) {
                await ctx.reply(
                    `❌ ${error.message}\n\n` +
                    'Iltimos, qaytadan urinib ko\'ring:',
                    { parse_mode: 'Markdown' }
                );
                ctx.scene.state.waitingForId = false;
                ctx.scene.reenter();
            }
        });
        
        scene.action(`cancel_${contestType.toLowerCase()}`, async (ctx) => {
            await ctx.answerCbQuery();
            await Utils.safeEditMessageText(ctx, '❌ Konkurs bekor qilindi.');
            ctx.scene.leave();
            await this.showMainMenu(ctx);
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
                            [Markup.button.callback('📣 Xabar yuborish', 'admin_broadcast')],
                            [Markup.button.callback('🚪 Chiqish', 'exit_admin')]
                        ])
                    }
                );
            } catch (error) {
                console.error('Admin scene enter error:', error);
                await ctx.reply('⚠️ Xatolik yuz berdi.');
                ctx.scene.leave();
            }
        });
        
        scene.action('admin_stats', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const stats = await DatabaseService.getStatistics();
                
                await Utils.safeEditMessageText(
                    ctx,
                    `📊 *BOT STATISTIKASI*\n\n` +
                    `👥 *Jami foydalanuvchilar:* ${stats.totalUsers}\n` +
                    `🚫 *Bloklanganlar:* ${stats.blockedUsers}\n` +
                    `📈 *Bugun qo'shilgan:* ${stats.todayUsers}\n` +
                    `🔥 *Faol foydalanuvchilar:* ${stats.activeUsers}\n` +
                    `✅ *Obuna bo'lganlar:* ${stats.subscribedUsers}\n\n` +
                    `🕒 *Oxirgi yangilanish:* ${Utils.formatTime()}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('Admin stats error:', error);
                await ctx.answerCbQuery('❌ Statistika olishda xatolik!');
            }
        });
        
        scene.action('admin_broadcast', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                
                // First show broadcast options
                await Utils.safeEditMessageText(
                    ctx,
                    '📣 *XABAR YUBORISH*\n\n' +
                    'Kimlarga xabar yubormoqchisiz?',
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('👥 Hammaga (barcha foydalanuvchilar)', 'broadcast_all')],
                            [Markup.button.callback('✅ Faqat obuna bo\'lganlarga', 'broadcast_subscribed')],
                            [Markup.button.callback('📱 iPhone ishtirokchilari', 'broadcast_iphone')],
                            [Markup.button.callback('📱 Redmi ishtirokchilari', 'broadcast_redmi')],
                            [Markup.button.callback('🚗 Gentra ishtirokchilari', 'broadcast_gentra')],
                            [Markup.button.callback('🔙 Orqaga', 'back_to_admin')]
                        ])
                    }
                );
            } catch (error) {
                console.error('Broadcast menu error:', error);
                await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
            }
        });
        
        // Broadcast options
        scene.action('broadcast_all', async (ctx) => {
            await ctx.scene.enter('broadcast_message', { filters: {} });
        });
        
        scene.action('broadcast_subscribed', async (ctx) => {
            await ctx.scene.enter('broadcast_message', { filters: { subscribed: true } });
        });
        
        scene.action('broadcast_iphone', async (ctx) => {
            await ctx.scene.enter('broadcast_message', { filters: { participatedIn: 'iphone' } });
        });
        
        scene.action('broadcast_redmi', async (ctx) => {
            await ctx.scene.enter('broadcast_message', { filters: { participatedIn: 'redmi' } });
        });
        
        scene.action('broadcast_gentra', async (ctx) => {
            await ctx.scene.enter('broadcast_message', { filters: { participatedIn: 'gentra' } });
        });
        
        scene.action('back_to_admin', async (ctx) => {
            await ctx.scene.reenter();
        });
        
        scene.action('exit_admin', async (ctx) => {
            await ctx.answerCbQuery();
            await Utils.safeEditMessageText(ctx, '✅ Admin paneldan chiqildi.');
            ctx.scene.leave();
            await BotScenes.showMainMenu(ctx);
        });
        
        return scene;
    }
    
    static createBroadcastScene() {
        const scene = new Scenes.BaseScene('broadcast_message');
        
        scene.enter(async (ctx) => {
            try {
                const filters = ctx.scene.state.filters || {};
                
                // Get user count for this filter
                const userCount = await DatabaseService.getUsersCount(filters);
                
                let targetDescription = '';
                if (filters.subscribed) {
                    targetDescription = '✅ *Faqat obuna bo\'lgan foydalanuvchilar*';
                } else if (filters.participatedIn) {
                    const contest = CONFIG.CONTESTS[filters.participatedIn.toUpperCase()];
                    targetDescription = `${contest.emoji} *${contest.name} ishtirokchilari*`;
                } else {
                    targetDescription = '👥 *Barcha foydalanuvchilar*';
                }
                
                await ctx.reply(
                    `📣 *XABAR YUBORISH*\n\n` +
                    `🎯 *Maqsadli auditoriya:* ${targetDescription}\n` +
                    `👥 *Foydalanuvchilar soni:* ${userCount} ta\n\n` +
                    `📝 Iltimos, yubormoqchi bo'lgan xabaringizni yuboring:\n\n` +
                    `ℹ️ *Qo'llab-quvvatlanadigan formatlar:*\n` +
                    `• Oddiy matn\n` +
                    `• Rasm + matn\n` +
                    `• Video + matn\n` +
                    `• GIF + matn\n` +
                    `• Fayl + matn\n` +
                    `• Ovozli xabar + matn\n\n` +
                    `❌ *Bekor qilish:* /cancel`,
                    { parse_mode: 'Markdown' }
                );
                
            } catch (error) {
                console.error('Broadcast scene enter error:', error);
                await ctx.reply('⚠️ Xatolik yuz berdi.');
                ctx.scene.leave();
                ctx.scene.enter('admin');
            }
        });
        
        scene.command('cancel', async (ctx) => {
            await ctx.reply('❌ Xabar yuborish bekor qilindi.');
            ctx.scene.leave();
            ctx.scene.enter('admin');
        });
        
        scene.on('message', async (ctx) => {
            try {
                const filters = ctx.scene.state.filters || {};
                const userCount = await DatabaseService.getUsersCount(filters);
                
                const content = Utils.extractContentFromMessage(ctx.message);
                if (!content) {
                    await ctx.reply('❌ Qo\'llab-quvvatlanmaydigan format!');
                    return;
                }
                
                // Send confirmation with user count
                const confirmText = content.type === 'text' 
                    ? `📝 *Matn xabar:*\n${content.message.substring(0, 200)}${content.message.length > 200 ? '...' : ''}`
                    : `🖼️ *${content.type.toUpperCase()} xabar*\n${content.caption ? `Matn: ${content.caption.substring(0, 100)}${content.caption.length > 100 ? '...' : ''}` : 'Matnsiz'}`;
                
                let targetDescription = '';
                if (filters.subscribed) {
                    targetDescription = '✅ Faqat obuna bo\'lgan foydalanuvchilar';
                } else if (filters.participatedIn) {
                    const contest = CONFIG.CONTESTS[filters.participatedIn.toUpperCase()];
                    targetDescription = `${contest.emoji} ${contest.name} ishtirokchilari`;
                } else {
                    targetDescription = '👥 Barcha foydalanuvchilar';
                }
                
                await ctx.reply(
                    confirmText + '\n\n' +
                    `🎯 *Maqsadli auditoriya:* ${targetDescription}\n` +
                    `👥 *Foydalanuvchilar soni:* ${userCount} ta\n\n` +
                    'Xabarni yuborishni tasdiqlaysizmi?',
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ HA, yuborish', 'confirm_broadcast')],
                            [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')]
                        ])
                    }
                );
                
                ctx.scene.state.broadcastContent = content;
                ctx.scene.state.userCount = userCount;
                
            } catch (error) {
                console.error('Broadcast message processing error:', error);
                await ctx.reply('❌ Xatolik yuz berdi.');
            }
        });
        
        scene.action('confirm_broadcast', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                await Utils.safeEditMessageText(ctx, '🔄 *Xabar yuborilmoqda...*\n\nIltimos, kuting...');
                
                const content = ctx.scene.state.broadcastContent;
                const filters = ctx.scene.state.filters || {};
                const userCount = ctx.scene.state.userCount;
                
                const result = await DatabaseService.broadcastMessage(ctx.telegram, content, {
                    ...filters,
                    adminId: ctx.from.id,
                    adminUsername: ctx.from.username || ctx.from.first_name
                });
                
                await Utils.safeEditMessageText(
                    ctx,
                    `✅ *XABAR YUBORISH YAKUNLANDI!*\n\n` +
                    `📊 *Natijalar:*\n` +
                    `🎯 Maqsadli auditoriya: ${userCount} ta\n` +
                    `👥 Jami urinish: ${result.total}\n` +
                    `✅ Muvaffaqiyatli: ${result.successful}\n` +
                    `❌ Muvaffaqiyatsiz: ${result.failed}\n\n` +
                    `📈 *Muvaffaqiyat darajasi:* ${((result.successful / result.total) * 100).toFixed(1)}%\n\n` +
                    `🕒 Yuborish vaqti: ${Utils.formatTime()}`,
                    { parse_mode: 'Markdown' }
                );
                
                // Reset state
                ctx.scene.state.broadcastContent = null;
                ctx.scene.state.userCount = null;
                
                // Return to admin panel
                setTimeout(async () => {
                    await ctx.scene.enter('admin');
                }, 3000);
                
            } catch (error) {
                console.error('Broadcast error:', error);
                await Utils.safeEditMessageText(
                    ctx,
                    '❌ *XABAR YUBORISHDA XATOLIK!*\n\n' +
                    `Xatolik: ${error.message}\n\n` +
                    'Iltimos, qaytadan urinib ko\'ring.',
                    { parse_mode: 'Markdown' }
                );
                
                // Reset state
                ctx.scene.state.broadcastContent = null;
                ctx.scene.state.userCount = null;
            }
        });
        
        scene.action('cancel_broadcast', async (ctx) => {
            await ctx.answerCbQuery();
            await Utils.safeEditMessageText(ctx, '❌ Xabar yuborish bekor qilindi.');
            
            // Reset state
            ctx.scene.state.broadcastContent = null;
            ctx.scene.state.userCount = null;
            
            ctx.scene.leave();
            ctx.scene.enter('admin');
        });
        
        return scene;
    }
    
    static async showMainMenu(ctx) {
        try {
            await ctx.reply(
                '🏠 *ASOSIY MENYU*\n\n' +
                'Quyidagi konkurslardan birini tanlang:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        [CONFIG.CONTESTS.IPHONE.button_text],
                        [CONFIG.CONTESTS.REDMI.button_text],
                        [CONFIG.CONTESTS.GENTRA.button_text],
                        ['📋 Konkurs haqida', '🔄 Obunani tekshirish']
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
            const buttons = channels.map(channel => {
                if (channel.requires_admin) {
                    return [Markup.button.url(`👑 ${channel.name} (ADMIN bo'lish)`, channel.url)];
                }
                return [Markup.button.url(`📢 ${channel.name}`, channel.url)];
            });
            
            buttons.push([Markup.button.callback('✅ Obunani tekshirish', 'check_subscription')]);
            
            const message = channels.some(c => c.requires_admin) ?
                '*DIQQAT!*\n\n' +
                'Ba\'zi kanallar uchun ADMIN bo\'lish talab qilinadi:\n\n' +
                '1. Senator 18+\n' +
                '2. Senator 19+\n\n' +
                'Ushbu kanallarga obuna bo\'lish uchun admin bo\'lishingiz kerak!' :
                'Botdan to\'liq foydalanish uchun quyidagi kanallarga obuna bo\'ling:';
            
            await ctx.reply(
                message,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(buttons)
                }
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
            const gentraScene = BotScenes.createContestScene('GENTRA');
            const adminScene = BotScenes.createAdminScene();
            const broadcastScene = BotScenes.createBroadcastScene();
            
            this.scenes = [iphoneScene, redmiScene, gentraScene, adminScene, broadcastScene];
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
                        if (ctx.callbackQuery) {
                            await ctx.answerCbQuery('⚠️ Xatolik yuz berdi.');
                        } else if (ctx.message) {
                            await ctx.reply('⚠️ Botda vaqtinchalik xatolik yuz berdi.');
                        }
                    } catch (e) {
                        console.error('Error reply failed:', e);
                    }
                }
            });
            
            // Setup user middleware
            this.bot.use(async (ctx, next) => {
                if (ctx.message || ctx.callbackQuery) {
                    try {
                        await DatabaseService.findOrCreateUser(ctx);
                    } catch (error) {
                        console.error('User middleware error:', error);
                    }
                }
                await next();
            });
            
            // Register commands and handlers
            this.registerCommands();
            this.registerActions();
            this.registerEventHandlers();
            
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
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (subscription.notSubscribed.length > 0) {
                    await ctx.reply(
                        '🎉 *SENATOR KONKURS BOTIGA XUSH KELIBSIZ!*\n\n' +
                        'Bu bot orqali siz quyidagi sovg\'alarni yutib olishingiz mumkin:\n' +
                        '🏆 5 ta iPhone 17 Pro Max\n' +
                        '🏆 10 ta Redmi telefon\n' +
                        '🏆 1 ta Chevrolet Gentra avtomobil\n\n' +
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
                await ctx.reply('⚠️ Botda vaqtinchalik xatolik yuz berdi.');
            }
        });
        
        // Admin command
        this.bot.command('admin', async (ctx) => {
            if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.reply('❌ Siz admin emassiz!');
            }
            ctx.scene.enter('admin');
        });
        
        // Stats command (admin only)
        this.bot.command('stats', async (ctx) => {
            if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.reply('❌ Siz admin emassiz!');
            }
            
            try {
                const stats = await DatabaseService.getStatistics();
                await ctx.reply(
                    `📊 *BOT STATISTIKASI*\n\n` +
                    `👥 Jami foydalanuvchilar: ${stats.totalUsers}\n` +
                    `🚫 Bloklanganlar: ${stats.blockedUsers}\n` +
                    `📈 Bugun qo'shilgan: ${stats.todayUsers}\n` +
                    `🔥 Faol foydalanuvchilar: ${stats.activeUsers}\n` +
                    `✅ Obuna bo'lganlar: ${stats.subscribedUsers}\n\n` +
                    `🕒 Oxirgi yangilanish: ${Utils.formatTime()}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('Stats command error:', error);
                await ctx.reply('❌ Statistika olishda xatolik yuz berdi.');
            }
        });
    }
    
    registerActions() {
        // Check subscription action
        this.bot.action('check_subscription', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const userId = ctx.from.id;
                const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
                
                if (subscription.notSubscribed.length > 0) {
                    await Utils.safeEditMessageText(
                        ctx,
                        '📢 *ILTIMOS, KANALLARGA OBUNA BO\'LING!*\n\n' +
                        'Botdan to\'liq foydalanish uchun quyidagi kanallarga obuna bo\'lishingiz kerak:',
                        { parse_mode: 'Markdown' }
                    );
                    await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                } else {
                    await Utils.safeEditMessageText(
                        ctx,
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
        });
        
        // Contest buttons
        this.bot.hears(CONFIG.CONTESTS.IPHONE.button_text, async (ctx) => {
            await this.handleContestButton(ctx, 'IPHONE');
        });
        
        this.bot.hears(CONFIG.CONTESTS.REDMI.button_text, async (ctx) => {
            await this.handleContestButton(ctx, 'REDMI');
        });
        
        this.bot.hears(CONFIG.CONTESTS.GENTRA.button_text, async (ctx) => {
            await this.handleContestButton(ctx, 'GENTRA');
        });
        
        // Other buttons
        this.bot.hears('📋 Konkurs haqida', async (ctx) => {
            await ctx.reply(
                '🏆 *KONKURS HAQIDA MA\'LUMOT*\n\n' +
                '🎁 *Sovg\'alar:*\n' +
                '• 5 ta iPhone 17 Pro Max\n' +
                '• 10 ta Redmi telefon\n' +
                '• 1 ta Chevrolet Gentra avtomobil\n\n' +
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
                '🚗 *Gentra yutish uchun:*\n' +
                '1. Saytga kirish\n' +
                '2. Promokod: SENATOR\n' +
                '3. Ariza to\'ldirish\n' +
                '4. ID ni yuborish\n\n' +
                '⚠️ *DIQQAT!*\n' +
                '• Har bir foydalanuvchi faqat bir marta qatnashishi mumkin!\n' +
                '• Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!\n' +
                '• Ba\'zi kanallarga ADMIN bo\'lish talab qilinadi!',
                { parse_mode: 'Markdown' }
            );
        });
        
        this.bot.hears('🔄 Obunani tekshirish', async (ctx) => {
            const userId = ctx.from.id;
            const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
            
            if (subscription.notSubscribed.length > 0) {
                await ctx.reply(
                    '❌ *SIZ BARCHA KANALLARGA OBUNA BO\'LMAGANSIZ!*\n\n' +
                    'Quyidagi kanallarga obuna bo\'lishingiz kerak:',
                    { parse_mode: 'Markdown' }
                );
                await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
            } else {
                await ctx.reply(
                    '✅ *BARCHA KANALLARGA OBUNA BO\'LGANSIZ!*\n\n' +
                    'Siz konkurslarda qatnashishingiz mumkin.',
                    { parse_mode: 'Markdown' }
                );
            }
        });
    }
    
    async handleContestButton(ctx, contestType) {
        const userId = ctx.from.id;
        
        try {
            const user = await DatabaseService.findOrCreateUser(ctx);
            const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);
            
            if (!subscription.isSubscribed) {
                await ctx.reply('❌ Avval barcha kanallarga obuna bo\'ling!', { parse_mode: 'Markdown' });
                await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
                return;
            }
            
            if (user && user.contests[contestType.toLowerCase()]?.participated) {
                const participantId = user.contests[contestType.toLowerCase()]?.participantId;
                await ctx.reply(
                    'ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n' +
                    'Siz ushbu konkursga allaqachon qatnashgansiz.\n' +
                    `📝 Sizning ID raqamingiz: ${participantId || 'Noma\'lum'}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }
            
            ctx.scene.enter(contestType.toLowerCase());
        } catch (error) {
            console.error(`${contestType} contest error:`, error);
            await ctx.reply('⚠️ Botda vaqtinchalik xatolik yuz berdi.');
        }
    }
    
    registerEventHandlers() {
        // Handle chat member updates
        this.bot.on('chat_member', async (ctx) => {
            try {
                const chatMember = ctx.chatMember;
                const userId = chatMember.new_chat_member.user.id;
                const chatId = chatMember.chat.id.toString();
                
                // Only check private channels
                if (!chatId.startsWith('-100')) return;
                
                const channel = CONFIG.REQUIRED_CHANNELS.find(c => c.id === chatId);
                if (!channel) return;
                
                const oldStatus = chatMember.old_chat_member.status;
                const newStatus = chatMember.new_chat_member.status;
                
                // User left
                if ((oldStatus === 'member' || oldStatus === 'administrator') && 
                    (newStatus === 'left' || newStatus === 'kicked')) {
                    
                    console.log(`👋 User ${userId} left channel ${channel.name}`);
                    await DatabaseService.handleUserLeftChannel(this.bot.telegram, chatId, userId);
                }
                
                // User joined
                if ((oldStatus === 'left' || oldStatus === 'kicked') && 
                    (newStatus === 'member' || newStatus === 'administrator')) {
                    
                    console.log(`👋 User ${userId} joined channel ${channel.name}`);
                    await DatabaseService.checkAndUpdateSubscription(this.bot.telegram, userId);
                }
            } catch (error) {
                console.error('Chat member update error:', error.message);
            }
        });
    }
    
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            await this.bot.launch({
                allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'chat_join_request']
            });
            
            const botInfo = await this.bot.telegram.getMe();
            console.log(`🤖 Bot: @${botInfo.username}`);
            console.log(`👑 Adminlar: ${CONFIG.ADMIN_IDS.length} ta`);
            console.log(`📊 Kanallar: ${CONFIG.REQUIRED_CHANNELS.length} ta`);
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
        
        process.once('SIGINT', () => bot.stop());
        process.once('SIGTERM', () => bot.stop());
        
        await bot.start();
    } catch (error) {
        console.error('❌ Botni ishga tushirishda og\'ir xatolik:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    SenatorBot,
    DatabaseService,
    CONFIG,
    User,
    Notification
};