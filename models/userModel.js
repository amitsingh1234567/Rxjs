const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const slugify = require('slugify');
 

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: String,
    role:{
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength:[8, 'Password should be at least 8 characters'] ,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        // This only works on CREATE and SAVE. not with UPDATE document
        validate:{
            validator: function(el){
                return el === this.password;
            },
            message: 'Passwords are not the same!'
        }  
    },
    passwordChangedAt: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    active:{
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if(!this.isModified('password')) return next();
        
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    console.log(this.password);

    // Delete passwordConfirm field
    this.passwordConfirm = undefined;
    next();
});


// If we didn't modify the password property. this function don't manipulate password change property
userSchema.pre('save', function() {
    if(!this.isModified('password') || this.isNew)  return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();

});

userSchema.pre(/^find/, function(next) {
    this.find({active: {$ne: false}});
    next();
});

// userSchema.post('save', function(doc){
//     console.log(doc)
// })

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
return await bcrypt.compare(candidatePassword, userPassword); 
}

userSchema.methods.changedPasswordAfter = function(JwtTimeStamp) {
    if(this.passwordChangedAt){
        const changeTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        
        return JwtTimeStamp < changeTimeStamp;
    }
    // False means NOT changed
    return false
}

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

   this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // console.log({resetToken}, this.passwordResetToken);

   this.passwordResetExpires = Date.now() + 20 * 60 * 1000;
                                                            
   return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;