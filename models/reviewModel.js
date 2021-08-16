// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review can not be empty!']
        },
        rating: {
            type: Number,
            min: [1, 'Review must be above 1'],
            max: [5, 'Review must be below 5']
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        }
    },       
    {
        // Schema Defination End
            toJSON: {virtuals: true},
            toObject: {virtuals: true}
    }
);


reviewSchema.index({ tour: 1, user: 1}, {unique: true});

reviewSchema.pre(/^find/, function(next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name',
    // }).populate({
    //     path: 'user',
    //     select: 'name'
    // });

    this.populate({
        path: 'user',
        select: 'name'
    });
    
    next();
});



reviewSchema.statics.calcAverageRatings = async function(tourId) {
   const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            } 
        }, 
    ]);
    // console.log(stats)
    if(stats.length > 0){
        await Tour.findByIdAndUpdate(tourId, {
            ratingQuentity: stats[0].nRating,
            ratingAverage: stats[0].avgRating
        });
    }else{
        await Tour.findByIdAndUpdate(tourId, {
            ratingQuentity: 0,
            ratingAverage: 4.5
        });
    }
};

reviewSchema.post('save', function(doc) {
    // this points to current review
    // constructor Points to Review MODEL variable
    this.constructor.calcAverageRatings(this.tour); 
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
    this.r = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function() {
    // this.r = await this.findOne(); does NOT work here, query has already executed.
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
