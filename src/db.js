import mongoose from 'mongoose'
import config from './config.js'

mongoose.connect(config.connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})