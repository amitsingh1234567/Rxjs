const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utilities/catchAsync');
const AppError = require('../utilities/appError');
const sendEmail = require('./../utilities/email');


const singToken = id => {
   return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res) => {
    const token =  singToken(user._id);
    const cokieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') cokieOptions.secure = true;
    res.cookie('jwt', token, cokieOptions);

    // Remove the password from the output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data:{
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await  User.create(req.body);
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync( async (req, res, next) => {
    const {email, password} = req.body;

    // 1) Check if email and password exist
    if(!email || !password){
        return next(new AppError('Please provide email and password!'));
    }

    // 2) Check if user exist && password is correct    
    user = await User.findOne({email}).select('+password');
    
    if(!user || !await user.correctPassword(password, user.password)){
        return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res); 
});

exports.protect = catchAsync(async (req, res, next) => {

    //  Getting token and check of it's here
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
       token = req.headers.authorization.split(' ')[1];
    }

    if(!token){
        return next(new AppError('You are not logged in! Please login to get access..', 401));
    }
    
    //  Varification token
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //  Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('This user belonging to this token does no longer exist.', 401));
    }

    //  Check if user changed password after the token was issued
   if(currentUser.changedPasswordAfter(decoded.iat)){
       return next(new AppError('User recently changed password! Please log in again.', 401));
   }
   
   // GRAND ACCESS TO PROTECTED ROUTE
   // May be use in futuer
   req.user = currentUser;
   next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles['admin', 'lead-role']
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next();
    }
};

exports.forgetPassword = catchAsync(async (req, res, next) => {

    // 1) Get user based on Posted email
    const user = await User.findOne({email: req.body.email});
    // console.log(new Date(user.passwordChangedAt).toString())
    
    if(!user){
        return next(new AppError('There is no user with this email address.', 404));
    };
    
    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const message = `Forget your password? Submit a PATCH request with your new password and passwordConfirm to:
    ${resetURL}. \n if you didn't forget your password, please ignore this email! `;
    
    try{
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 20 min)',
            message
        });

    res.status(200).json({
        status: 'success',
        message: 'Token send to email'
    });
    }catch(err){

        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});

    return next(new AppError('There was an error sending the email. Try again later!'), 500);
    } 
});


exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gte: Date.now() }
    });
    // 2) If token has not expired, and there is user, set the new password
    if(!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // 3) Update changePasswordAt property for the user
    // 4) Login the user in, send JWT
    createSendToken(user, 200, res); 
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    
    // 2) Check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will not work as intended!

    // 4) Login user in, send JWT
    createSendToken(user, 200, res); 
});
