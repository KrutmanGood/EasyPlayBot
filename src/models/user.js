import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true, 
    },
    username: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    isUser: {
        type: Boolean,
        default: true,
    }
})

const User = mongoose.model('User', userSchema)

export default User