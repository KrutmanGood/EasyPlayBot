import { Telegraf, Markup, session } from 'telegraf'
import config from './config.js'
import User from './models/user.js'

const bot = new Telegraf(config.botToken)
bot.use(session())

const cancelBtn = [
    [
        Markup.button.callback('Отменить действие', 'cancelBtn')
    ]
]

bot.start(async ctx => {
    try {
        const checkSubBtn = [
            [
                Markup.button.callback('Проверить', 'checkSubBtn')
            ],
        ]
    
        ctx.reply('Перед использованием бота, тебе нужно подписаться на канал:\n\n@канал', {
            reply_markup: { inline_keyboard: checkSubBtn }
        })
    } catch(e) {
        console.log(e)
    }
})

bot.command('admin', async ctx => {
    const messageInfo = ctx.update.message
    ctx.session = ctx.session || {}

    try {
        if (config.adminId.includes(messageInfo.from.id)) {
            const adminButtons = [
                [
                    Markup.button.callback('📬 Отправить сообщение', 'sendMessageBtn')
                ],
                [
                    Markup.button.callback('Отменить действие', 'cancelBtn')
                ],
            ]
    
            ctx.telegram.sendMessage(messageInfo.from.id, 'Выберите необходимую команду в списке ниже:', {
                reply_markup: { keyboard: adminButtons, resize_keyboard: true, }
            })
        }
    } catch(e) {
        console.log(e)
    }
})

bot.action(/.+/, async ctx => {
    const callbackInfo = ctx.update.callback_query

    try {
        if (callbackInfo.data === 'checkSubBtn') {
            const sub = await ctx.telegram.getChatMember(config.channelId, callbackInfo.from.id)
    
            if (sub.status === 'member') {
                await ctx.telegram.sendMessage(callbackInfo.from.id, 'Ждите новых сообщений от бота! :)')
    
                const user = await User.findOne({
                    id: callbackInfo.from.id
                })
    
                if (!user) {
                    if (callbackInfo.from.username === undefined || callbackInfo.from.last_name === undefined || callbackInfo.from.username === undefined && callbackInfo.from.last_name === undefined) {
                        if (callbackInfo.from.last_name === undefined && callbackInfo.from.username === undefined) {
                            await User.create({
                                firstName: callbackInfo.from.first_name,
                                lastName: 'не указанo',
                                username: 'не указанo',
                                id: callbackInfo.from.id,
                            })
        
                            return
                        }
                        
                        if (callbackInfo.from.username === undefined) {
                            await User.create({
                                firstName: callbackInfo.from.first_name,
                                lastName: callbackInfo.from.last_name,
                                username: 'не указан',
                                id: callbackInfo.from.id,
                            })
        
                            return
                        }
        
                        if (callbackInfo.from.last_name === undefined) {
                            await User.create({
                                firstName: callbackInfo.from.first_name,
                                lastName: 'не указанo',
                                username: callbackInfo.from.username,
                                id: callbackInfo.from.id,
                            })
        
                            return
                        }
                    } else {
                        await User.create({
                            firstName: callbackInfo.from.first_name,
                            lastName: callbackInfo.from.last_name,
                            username: callbackInfo.from.username,
                            id: callbackInfo.from.id,
                        })
                    }
                }
            } else {
                ctx.answerCbQuery('Вы не подписаны на канал!', { show_alert: true, })
            }
        }
    } catch(e) {
        console.log(e)
    }
})

bot.on('message', async ctx => {
    const messageInfo = ctx.update.message
    ctx.session = ctx.session || {}

    try {
        const buttonNames = ['📬 Отправить сообщение', '📸 С фото', '❌ Без фото', 'Да', 'Нет', 'Отменить действие']

        if (buttonNames.includes(messageInfo.text) && config.adminId.includes(messageInfo.from.id)) {
            if (messageInfo.text === '📬 Отправить сообщение') {
                const modeBtn = [
                    [
                        Markup.button.callback('📸 С фото', 'withPhoto'), Markup.button.callback('❌ Без фото', 'withoutPhoto')
                    ],
                    [
                        Markup.button.callback('Отменить действие', 'cancelBtn')
                    ],
                ]

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Выберите режим:', {
                    reply_markup: { keyboard: modeBtn, resize_keyboard: true, }
                })

                ctx.session.stage1 = true
            }

            if (messageInfo.text === '📸 С фото' && ctx.session.stage1) {
                ctx.session.stage1 = false

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Пришлите фото, которое нужно отправить:', {
                    reply_markup: { keyboard: cancelBtn, resize_keyboard: true }
                })

                ctx.session.stage2 = true
                ctx.session.photo = true
            }

            if (messageInfo.text === '❌ Без фото' && ctx.session.stage1) {
                ctx.session.stage1 = false

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Введите текст сообщения:', {
                    reply_markup: { keyboard: cancelBtn, resize_keyboard: true }
                })

                ctx.session.stage3 = true
                ctx.session.photoId = false
            }

            if (messageInfo.text === 'Да' && ctx.session.stage4) {
                ctx.session.stage4 = false

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Введите текст кнопки:', {
                    reply_markup: { keyboard: cancelBtn, resize_keyboard: true }
                })

                ctx.session.stage5 = true
            }

            if (messageInfo.text === 'Нет' && ctx.session.stage4) {
                ctx.session.stage4 = false

                const users = await User.find({
                    isUser: true,
                })

                if (ctx.session.photoId) {
                    users.forEach(async el => {
                        const userId = el.id
        
                        await ctx.telegram.sendPhoto(userId, ctx.session.photoId, {
                            parse_mode: 'Markdown',
                            caption: `${ctx.session.message}`
                        })
                    })
                } else {
                    users.forEach(async el => {
                        const userId = el.id
        
                        await ctx.telegram.sendMessage(userId, `${ctx.session.message}`)
                    })
                }

                ctx.telegram.sendMessage(messageInfo.from.id, 'Все готово!', {
                    reply_markup: { hide_keyboard: true }
                })
            }

            if (messageInfo.text === 'Отменить действие') {
                ctx.session = {}

                ctx.telegram.sendMessage(messageInfo.from.id, 'Действие отменено', {
                    reply_markup: { hide_keyboard: true, }
                })
            }
        } else {
            if (ctx.session.stage2 && ctx.session.photo) {
                ctx.session.stage2 = false
                ctx.session.photo = false

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Введите текст сообщения:', {
                    reply_markup: { keyboard: cancelBtn, resize_keyboard: true }
                })

                ctx.session.photoId = messageInfo.photo[3].file_id
                ctx.session.stage3 = true

                return
            }

            if (ctx.session.stage3) {
                ctx.session.stage3 = false

                const addButton = [
                    [
                        Markup.button.callback('Да', 'addBtn'), Markup.button.callback('Нет', 'notAddBtn')
                    ],
                    [
                        Markup.button.callback('Отменить действие', 'cancelBtn')
                    ],
                ]

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Хотите добавить кнопку?', {
                    reply_markup: { keyboard: addButton, resize_keyboard: true, }
                })

                ctx.session.stage4 = true
                ctx.session.message = messageInfo.text

                return
            }

            if (ctx.session.stage5) {
                ctx.session.stage5 = false

                await ctx.telegram.sendMessage(messageInfo.from.id, 'Введите ссылку, которую нужно поместить в кнопку:', {
                    reply_markup: { keyboard: cancelBtn, resize_keyboard: true }
                })

                ctx.session.stage6 = true
                ctx.session.buttonName = messageInfo.text

                return
            }

            if (ctx.session.stage6) {
                ctx.session.stage6 = false

                const link = [
                    [
                        Markup.button.url(`${ctx.session.buttonName}`, `${messageInfo.text}`)
                    ]
                ]

                const users = await User.find({
                    isUser: true,
                })

                if (ctx.session.photoId) {
                    users.forEach(async el => {
                        const userId = el.id
        
                        const photo = await ctx.telegram.sendPhoto(userId, ctx.session.photoId, {
                            parse_mode: 'Markdown',
                            caption: `${ctx.session.message}`
                        })
        
                        await ctx.telegram.editMessageReplyMarkup(userId, photo.message_id, photo.message_id, { inline_keyboard: link })
                    })

                    ctx.session.photo_id = false
                } else {
                    users.forEach(async el => {
                        const userId = el.id
        
                        await ctx.telegram.sendMessage(userId, `${ctx.session.message}`, {
                            reply_markup: { inline_keyboard: link }
                        })
                    })
                }

                ctx.telegram.sendMessage(messageInfo.from.id, 'Все готово!', {
                    reply_markup: { hide_keyboard: true }
                })
            }
        }
    } catch(e) {
        console.log(e)
    }
})

bot.launch()