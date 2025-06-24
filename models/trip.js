// backend/models/Trip.js
const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    destination: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true,
        min: 1
    },
    itinerary: {
        type: [
            {
                day: { type: Number, required: true },
                date: { type: Date },
                day_of_week: { type: String, trim: true },
                activities: {
                    type: [
                        {
                            time: { type: String, trim: true },
                            name: { type: String, required: true, trim: true },
                            description: { type: String, trim: true },
                            estimated_duration_minutes: { type: Number },
                            type: { type: String, trim: true },
                            location: {
                                lat: { type: Number },
                                lng: { type: Number }  
                            },
                            osm_url: { type: String, trim: true } 
                        }
                    ],
                    required: true
                },
                notes: { type: String, trim: true }
            }
        ],
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'planned', 'completed', 'archived'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

TripSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Trip = mongoose.model('Trip', TripSchema);

module.exports = Trip;