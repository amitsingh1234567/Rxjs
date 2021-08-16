const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');


const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must be a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'A tour name must have a less or equal to 40 characters',],
        minlength: [4, 'A tour name must have a more or equal to 4 characters',],
        // validate: [validator.isAlpha, 'A tour name must have only character']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: { 
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficult is either: easy, medium, difficult'
        }
    },
    ratingAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10 // 4.666666, 4.6666, 47, 4.7
    },
    ratingQuentity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must be a price']
    },
    priceDiscount:{
       type: Number,
       validate: {
           validator: function(val) {
            // this keyword only points the current doc on NEW document creation. (it will not work when you update document)
            return val < this.price
        },
        message: 'Discount price ({VALUE}) should be below regular price'
       }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a description']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover : {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now,
        select:false
    },
    startDates: [Date],

    secretTour: {
        type: Boolean,
        default: false
    },

    startLocation: {
        // MongoDB Geospatial Data
        // Geospatial Indexes MongoDB
        // GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum : ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
        }
    ],
    
    // guides: Array

},
// Schema Defination End   
{
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
}
);


// tourSchema.index({price: 1});
tourSchema.index({price: 1, ratingAverage: -1});
tourSchema.index({slug: 1});
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function(){
    return this.duration / 7;
});

// Virtual Populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// DOCUMENT MIDDLEWARE: runs befour .save() and .crete()  Not work with insertMany()
tourSchema.pre("save", function(next) {
    this.slug = slugify(this.name, {lower: true});
    next();
});

// tourSchema.pre('save', async function(next) {
//     const guidesPromises = this.guides.map(async id =>  await User.findById(id));
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// Refrence code
// tourSchema.pre("save", function(next) {
//     // console.log('Will save document...')
//     next();
// });

// tourSchema.post('save', function(doc){
//     // console.log(doc)
// })

//  QUERY MIDDLEWARE
// tourSchema.pre('find', function(next) {
tourSchema.pre(/^find/, function(next) {
    this.find({secretTour: {$ne: true}});

    this.start = Date.now();
    next();

});

tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
});

tourSchema.post(/^find/, function(doc, next) {
    console.log(`Query took ${Date.now() - this.start} milliseconds!`);
    next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function(next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     // console.log(this.pipeline());
//     next();
// });


module.exports = Tour = mongoose.model('Tour', tourSchema);
