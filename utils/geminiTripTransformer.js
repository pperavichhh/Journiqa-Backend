function transformGeminiOutputToTripSchema(geminiRawOutput, generalTripDetails) {
    // โค้ดส่วนนี้คือที่ generalTripDetails ถูกใช้งานและถูกประกาศเป็น parameter
    if (!geminiRawOutput || !Array.isArray(geminiRawOutput.plan)) {
        throw new Error("Invalid Gemini output format. 'plan' array is missing or invalid.");
    }

    const transformedItinerary = geminiRawOutput.plan.map((dayPlan, index) => {
        const activities = dayPlan.activities.map(activity => ({
            time: activity.time,
            name: activity.name,
            description: activity.description,
            estimated_duration_minutes: activity.estimated_duration_minutes,
            type: activity.type,
            location: ""
        }));

        let dateForDay = null;
        if (generalTripDetails && generalTripDetails.startDate) {
            const start = new Date(generalTripDetails.startDate);
            dateForDay = new Date(start.setDate(start.getDate() + (index))); // Changed index to day number to calculate correctly
        }

        return {
            day: index + 1,
            date: dateForDay,
            day_of_week: dayPlan.day_of_week,
            activities: activities,
            notes: ""
        };
    });

    // ตรวจสอบว่า generalTripDetails มีค่าก่อนที่จะ destructure
    if (!generalTripDetails || !generalTripDetails.tripName || !generalTripDetails.destination || !generalTripDetails.startDate || !generalTripDetails.endDate || typeof generalTripDetails.duration === 'undefined') {
        throw new Error("Missing general trip details (tripName, destination, startDate, endDate, duration) for transformation.");
    }

    const { tripName, destination, startDate, endDate, duration } = generalTripDetails; // <-- ตรงนี้

    return {
        tripName: tripName,
        destination: destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: duration,
        itinerary: transformedItinerary,
        status: 'draft'
    };
}

module.exports = { transformGeminiOutputToTripSchema };