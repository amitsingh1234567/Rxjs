const Tour = require('./../models/tourModel');
const catchAsync = require('../utilities/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utilities/appError');

module.exports = {
    aliasTopTours: (req, res, next) => {
        req.query.limit = '5';
        req.query.sort = '-ratingAverage,price';
        req.query.fields = 'name,price,ratingAverage,summary,difficulty';
        next();
    },
    
    
    // getTour: catchAsync( async (req, res, next) => {
        //     // let query = await Model.findById(req.params.id);
    //     // if(popOptions) query = query.populate(popOptions);
    //     // const doc = await query;
    //     const doc = await Tour.findById(req.params.id).populate('reviews');
        
    //     if(!doc){
        //         return next(new AppError('No document found with that ID', 404))
        //     }
        //     res.status(200)
        //     .json(
            //         {
                //             success:true,
                //             data:{
                    //                 data: doc
                    //             }
                    //         }
                    //     );
                    // }),

    getAllTours: factory.getAll(Tour),      
    getTour: factory.getOne(Tour, { path: 'reviews' }),
    createTour: factory.createOne(Tour),
    updateTour: factory.updateOne(Tour),
    deleteTour: factory.deleteOne(Tour),

    // deleteTour: catchAsync( async (req, res, next) => {
    //         const tour = await Tour.findByIdAndDelete(req.params.id)
    //         if(!tour){
    //             return next(new AppError('No tour found with this ID', 404))
    //          }
    //         res.status(200)
    //         .json(
    //             {
    //                 success:true,
    //                 data:{
    //                  tour
    //                 }
    //             }
    //         );
    // }),

    getTourStats: catchAsync( async (req, res) => {
            const stats = await Tour.aggregate([
                {
                    $match: {ratingAverage: {$gte: 4}}    
                },
                {
                    $group:{
                        _id: {$toUpper: '$difficulty'},                        
                        numTours:{ $sum: 1},
                        numRatings:{ $sum: '$ratingQuentity'},
                        avgRating: {$avg: '$ratingAverage'},
                        avgPrice: {$avg: '$price'},
                        minPrice: {$min: '$price'},
                        maxPrice: {$max: '$price'},
                    }
                },
                {
                    $sort:{ avgPrice: -1}
                },
                {
                    $match: {_id: {$ne: 'EASY'}}    
                }, 
            ]);
            res.status(200).json(
                {
                    success: true,
                    data: {
                        stats
                    }
                });
    }),

    getMonthlyPlan: catchAsync( async (req, res) => {
            const year = req.params.year * 1;
            const plan = await Tour.aggregate([
                {
                    $unwind: '$startDates'
                },
                {
                    $match: {
                        startDates: {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`)
                        }
                    }
                },
                /***********---->  As a Refrence code writen by Me  <----**********/
                // {
                //     $project:{
                //         month: { $month: "$startDates" },
                //         dayOfWeek: { $dayOfWeek: "$startDates" },
                //         week: { $week: "$startDates" },
                //         Dates:{ $dateToString: { format: "%d-%m-%Y", date: "$startDates" } }
                //     }
                // },
                {
                    $group:{
                        _id: { $month: "$startDates" },
                        numTourStarts: {$sum: 1},
                        tours: {$push: '$name'},                            
                    }
                },
                {
                    $addFields: {month: '$_id'}
                },
                {
                    $project: {
                    _id: 0
                    },
                },
                {
                    $sort:{numTourStarts: 1}
                }
            ]);
            res.status(200).json(
                {
                    success: true,
                    length: plan.length,
                    data: {
                        plan
                    }
                });
    }),

    // /tours-within?distance=233&center=-45,45&unit=mi
    // /tours-within/233/center/34.111745,-118.113491/unit/mi
    getToursWithin: catchAsync( async (req, res, next) => {
        const { distance, latlng, unit } = req.params;
        const [lat, lng] = latlng.split(',');

        const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

        if(!lat || !lng) {
            next(new AppError('Please provide latitute and longitude in the formate lat,lng. ', 400));
        }
        // console.log(distance, latlng, unit)
        const tours = await Tour.find({
            startLocation: { $geoWithin: { $centerSphere: [[lat, lng], radius] } }
        });

        res.status(200)
        .json({
            status: 'success',
            results: tours.length,
            data: tours
        });
    }),

    getDistances: catchAsync( async (req, res, next) => {
        const { latlng, unit } = req.params;
        const [lat, lng] = latlng.split(',');

        const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

        if(!lat || !lng) {
            next(new AppError('Please provide latitute and longitude in the formate lat,lng. ', 400));
        }

        const distances = await Tour.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [lan  * 1, lat * 1]
                    },
                    distanceField: 'distance',
                    distanceMultiplier: multiplier
                }
            },
            {
                $project: {
                    distance: 1,
                    name: 1
                }
            }
        ])

        res.status(200)
        .json({
            status: 'success',
            data: distances
        });
    })

    // checkID:(req, res, next, val) => {
    //     console.log(`Tower id is: ${val}`);
    //     if(req.params.id * 1 > 10){
    //         return res.status(404).json({
    //             message: 'Invalid ID!'
    //         });
    //     }
    //     next();
    // },

    // checkBody:(req, res, next) => {
    //     if(!req.body.name || !req.body.price){
    //         return res.status(400).json({
    //             success: false,
    //             message: 'Missing name and price'
    //         });
    //     }
    //     next();
    // },
};