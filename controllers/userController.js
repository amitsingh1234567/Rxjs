const User = require('../models/userModel');
const catchAsync = require('../utilities/catchAsync');
const AppError = require('./../utilities/appError');
const factory = require('./handlerFactory');


const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
}

module.exports = {

    getMe: (req, res, next) => {
        req.params.id = req.user.id;
        next();
    },

    updateMe: catchAsync( async (req, res, next) => {
        // 1) Create error if user POSTs password data
        if(req.body.password || req.body.passwordConfim){
            return next(new AppError('This route is not for password updates. Please use /updateMypassword.', 400));
        }
       // 2) Filtered out unwanted fields names that are not allowed to be update
        const filterBody = filterObj(req.body, 'name', 'email');
        // 2) Update user document
        const updateUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            status: 'success',
            data: {
                updateUser
            }
        });
    }),

    deleteMe: catchAsync (async (req, res, next) => {
        await User.findByIdAndUpdate(req.user.id, {active: false});

        res.status(204).json({
            status: 'success',
            data: null
        });
    }),

    createUser:(req, res, next) => {
        res.status(200).json({message:'Hello from createUserControllers'});
    },

    getUser: factory.getOne(User),
    getAllUsers: factory.getAll(User),
    
    // DO NOT update passwords with this!
    updateUser: factory.updateOne(User),

    deleteUser: factory.deleteOne(User)


    // checkID:(req, res, next, val) => {
    //     console.log(`Tower id is: ${val}`);
    //     if(req.params.id * 1 > 10){
    //         return res.status(404).json({
    //             message: 'Invalid ID!'
    //         });
    //     }
    //     next();
    // },
};