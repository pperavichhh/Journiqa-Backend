// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// โหลด prompt จากไฟล์
const tripPromptPath = path.join(__dirname, '../prompts/prompt.txt');
const basePrompt = fs.readFileSync(tripPromptPath, 'utf8');


// Configure Gemini API (ต้องแน่ใจว่า .env ถูกโหลดใน server.js แล้ว)
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not set. This route will not function correctly.");
    // ใน production อาจจะ throw error หรือ handle อย่างอื่น
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });


async function getPlaceDetailsFromNominatim(placeName) {
    try {
        const query = encodeURIComponent(`${placeName}, Bangkok Central Business District`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'GeminiTripPlanner/1.0 (your-email@example.com)'
            }
        });
        const data = response.data;

        if (data && data.length > 0) {
            const result = data[0];
            return {
                name: result.display_name.split(',')[0].trim(),
                location: {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                },
                osm_url: result.osm_type && result.osm_id ? `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}` : null
            };
        }
    } catch (error) {
        console.error(`Error fetching place details for '${placeName}' from Nominatim:`, error.message);
    }
    return null;
}

function getDayOfWeek(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}


router.post('/plan-trip', async (req, res) => {


    const {
        start_date,
        end_date,
        interests,
        budget,
        travel_style
    } = req.body;

    const dynamicPrompt = basePrompt
    .replace('{start_date}', start_date)
    .replace('{end_date}', end_date)
    .replace('{interests}', interests.join(', '))
    .replace('{budget}', budget)
    .replace('{travel_style}', travel_style);


    if (!start_date || !end_date || !interests || !budget || !travel_style) {
        return res.status(400).json({ error: "Missing required parameters. Please ensure all fields are provided." });
    }

    try {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        const timeDiff = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const numDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;


        const geminiResponse = await geminiModel.generateContent(dynamicPrompt);
        let responseText = geminiResponse.response.text();

        // ✅ ลอก Markdown wrapper ออกก่อน
        if (responseText.startsWith("```json") || responseText.startsWith("```")) {
            responseText = responseText.replace(/```json|```/g, "").trim();
        }

        let generatedPlan;
        try {
            generatedPlan = JSON.parse(responseText);
            if (!generatedPlan.plan) {
                throw new Error("Gemini response missing 'plan' key. Raw response: " + responseText.substring(0, 200));
            }
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", responseText, parseError);
            return res.status(500).json({ error: "Failed to generate a valid plan from AI. Please try again or refine your query. AI response might not be in perfect JSON format." });
        }


        const enrichedPlan = [];
        for (const dayPlan of generatedPlan.plan) {
            const enrichedActivities = [];
            for (const activity of dayPlan.activities) {
                const placeName = activity.name;
                if (placeName) {
                    const nominatimDetails = await getPlaceDetailsFromNominatim(placeName);
                    if (nominatimDetails) {
                        Object.assign(activity, {
                            location: nominatimDetails.location,
                            osm_url: nominatimDetails.osm_url
                        });
                    }
                    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit for Nominatim
                }
                enrichedActivities.push(activity);
            }
            enrichedPlan.push({
                date: dayPlan.date,
                day_of_week: getDayOfWeek(dayPlan.date),
                activities: enrichedActivities
            });
        }

        const responseData = {
            trip_id: `trip-${Date.now()}`,
            destination: "Bangkok Central Business District",
            start_date: start_date,
            end_date: end_date,
            plan: enrichedPlan,
            notes: "แผนที่สร้างขึ้นเป็นข้อเสนอแนะเท่านั้น รายละเอียดสถานที่ได้มาจาก OpenStreetMap โปรดตรวจสอบรายละเอียด, เวลาทำการ, และเวลาเดินทางอีกครั้งก่อนการเดินทางของคุณ รูปภาพสถานที่ไม่มีให้บริการจาก Nominatim"
        };

        res.json(responseData);

    } catch (error) {
        console.error("Error processing trip plan request:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิดขณะสร้างแผนการเดินทาง กรุณาตรวจสอบบันทึกข้อผิดพลาดของเซิร์ฟเวอร์" });
    }
});

module.exports = router;