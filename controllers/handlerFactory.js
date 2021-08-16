const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('../utilities/apiFeatures');
const AppError = require('./../utilities/appError');


exports.deleteOne = Model =>  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id)
    if (!doc) {
        return next(new AppError('No document found with that ID', 404))
    }
    res.status(200)
        .json(
            {
                success: true,
                data: {
                    doc
                }
            }
        );
});
    

exports.updateOne = Model => catchAsync( async (req, res, next) => {
    const tour = await Model.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true},);
    if(!tour){
        return next(new AppError('No documend found with this ID', 404))
     }
    res.status(200)
    .json(
        {
            success:true,
            data:{
             tour
            }
        }
    );
});


exports.createOne = Model => catchAsync( async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(200)
    .json(
        {
            success:true,
            data:{
                data: doc
            }
        }
    );
});

exports.getOne = (Model, popOptions) => catchAsync( async (req, res, next) => {
    let doc = await Model.findById(req.params.id).populate(popOptions);
    // let query = await Model.findById(req.params.id);
    // if(popOptions) query =  query.populate(popOptions);

    // const doc = await query;
    // const doc = await Model.findById(req.params.id).populate('reviews');

    if(!doc){
       return next(new AppError('No document found with that ID', 404))
    }
    res.status(200)
    .json(
        {
            success:true,
            data:{
                data: doc
            }
        }
    );
});


exports.getAll = Model => 
catchAsync( async (req, res, next) => {  
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if(req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();
    // const doc = await features.query.explain();
    const doc = await features.query;

 //    .where('duration')
 //    .equals(4)
 //    .where('difficulty')
 //    .equals('easy')

    // SEND RESPONCE
    res.status(200).json(
     {
      success: true,
      length: doc.length,
      data: {
      data: doc
     }
     });
});


