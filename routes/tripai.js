// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs'); // Node.js File System module
const path = require('path'); // Node.js Path module

// Load prompt from external file
const tripPromptPath = path.join(__dirname, '../prompts/prompt.txt');
const basePrompt = fs.readFileSync(tripPromptPath, 'utf8');

// Configure Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not set. This route will not function correctly.");
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Simple in-memory cache for Nominatim results
const nominatimCache = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Cache for 24 hours

/**
 * Fetches place details (latitude, longitude, OSM URL) from Nominatim (OpenStreetMap).
 * IMPORTANT: Adheres to Nominatim's User-Agent and Rate Limit policies.
 * @param {string} placeName - The name of the place to search for.
 * @returns {Object|null} - Basic place info or null if not found/error.
 */
async function getPlaceDetailsFromNominatim(placeName) {
    const cacheKey = `${placeName.toLowerCase().trim()},bangkok central business district`;

    // Check cache first
    if (nominatimCache[cacheKey] && (Date.now() - nominatimCache[cacheKey].timestamp < CACHE_TTL_MS)) {
        console.log(`[Nominatim Cache] Serving '${placeName}' from cache.`);
        return nominatimCache[cacheKey].data;
    }

    try {
        // Hardcoded destination for Nominatim query
        const query = encodeURIComponent(`${placeName}, Bangkok Central Business District`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

        const response = await axios.get(url, {
            headers: {
                // *** IMPORTANT: Replace with YOUR actual email for Nominatim policy compliance ***
                'User-Agent': 'GeminiTripPlanner/1.0 (your.actual.email@example.com)'
            }
        });
        const data = response.data;

        if (data && data.length > 0) {
            const result = data[0];
            const placeDetails = {
                // Try to get just the main name part
                name: result.display_name.split(',')[0].trim(),
                location: {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                },
                osm_url: result.osm_type && result.osm_id ? `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}` : null
            };

            // Store in cache before returning
            nominatimCache[cacheKey] = {
                data: placeDetails,
                timestamp: Date.now()
            };
            return placeDetails;
        }
    } catch (error) {
        console.error(`Error fetching place details for '${placeName}' from Nominatim:`, error.message);
        // Log more specific error for 403
        if (error.response && error.response.status === 403) {
            console.error("Nominatim 403 Error: Make sure your User-Agent header (your.actual.email@example.com) is unique and valid.");
        }
    }
    return null;
}

/**
 * Helper function to get the day of the week from a date string.
 * @param {string} dateString - Date in 'YYYY-MM-DD' format.
 * @returns {string} Day name (e.g., 'Monday').
 */
function getDayOfWeek(dateString) {
    // Adding 'T00:00:00' to ensure consistent date interpretation (UTC start of day)
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// API Route for trip planning
router.post('/plan-trip', async (req, res) => {
    // Destructure required parameters from request body (travelers removed)
    const {
        start_date,
        end_date,
        interests,
        budget,
        travel_style
    } = req.body;

    // Basic input validation (travelers removed)
    if (!start_date || !end_date || !interests || !budget || !travel_style) {
        return res.status(400).json({ error: "Missing required parameters. Please ensure all fields are provided." });
    }

    try {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        const timeDiff = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const numDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end day

        // Dynamically replace placeholders in the loaded prompt (travelers replacements removed)
        const prompt = basePrompt
            .replace('{start_date}', start_date)
            .replace('{end_date}', end_date)
            .replace('{numDays}', numDays) // numDays is in prompt.txt
            .replace('{interests}', interests.join(', '))
            .replace('{budget}', budget)
            .replace('{travel_style}', travel_style);

        console.log("Sending prompt to Gemini...");
        const geminiResponse = await geminiModel.generateContent(prompt);
        let responseText = geminiResponse.response.text();

        // Remove Markdown code block wrappers (```json or ```) if present
        if (responseText.startsWith("```json")) {
            responseText = responseText.substring(7, responseText.lastIndexOf("```")).trim();
        } else if (responseText.startsWith("```")) {
             responseText = responseText.substring(3, responseText.lastIndexOf("```")).trim();
        }

        let generatedPlan;
        try {
            generatedPlan = JSON.parse(responseText);
            if (!generatedPlan.plan) {
                // If Gemini returns a valid JSON but without the 'plan' key
                throw new Error("Gemini response is valid JSON but missing 'plan' key. Raw response: " + responseText.substring(0, 200));
            }
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON. Raw response:", responseText);
            console.error("Parsing error:", parseError.message);
            // Provide a more helpful error if parsing fails
            return res.status(500).json({
                error: "Failed to generate a valid plan from AI. The AI's response was not in the expected JSON format. Please try again or refine your query.",
                ai_raw_response: responseText.substring(0, 500) // Include part of raw response for debugging
            });
        }

        // Enrich the plan with location data from Nominatim
        const enrichedPlan = [];
        for (const dayPlan of generatedPlan.plan) {
            const enrichedActivities = [];
            for (const activity of dayPlan.activities) {
                const placeName = activity.name;
                if (placeName) {
                    const nominatimDetails = await getPlaceDetailsFromNominatim(placeName);
                    if (nominatimDetails) {
                        // Add location (lat/lng) and OSM URL to the activity object
                        Object.assign(activity, {
                            location: nominatimDetails.location,
                            osm_url: nominatimDetails.osm_url
                        });
                    }
                    // Crucial for Nominatim rate limits: pause between requests for UNCACHED items.
                    // Cached requests will bypass this, making subsequent lookups faster.
                    if (!nominatimCache[`${placeName.toLowerCase().trim()},bangkok central business district`] ||
                        (Date.now() - nominatimCache[`${placeName.toLowerCase().trim()},bangkok central business district`].timestamp >= CACHE_TTL_MS)) {
                        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds delay for uncached requests
                    }
                }
                enrichedActivities.push(activity);
            }
            enrichedPlan.push({
                date: dayPlan.date,
                day_of_week: getDayOfWeek(dayPlan.date),
                activities: enrichedActivities
            });
        }

        // Final response object
        const responseData = {
            trip_id: `trip-${Date.now()}`,
            destination: "Bangkok Central Business District", // Hardcoded destination
            start_date: start_date,
            end_date: end_date,
            plan: enrichedPlan,
            notes: "แผนที่สร้างขึ้นเป็นข้อเสนอแนะเท่านั้น รายละเอียดสถานที่ได้มาจาก OpenStreetMap โปรดตรวจสอบรายละเอียด, เวลาทำการ, และเวลาเดินทางอีกครั้งก่อนการเดินทางของคุณ รูปภาพสถานที่ไม่มีให้บริการจาก Nominatim."
        };

        res.json(responseData);

    } catch (error) {
        console.error("Error processing trip plan request:", error);
        // Differentiate between AI generation error and other errors
        if (error.name === 'GoogleGenerativeAIFetchError') {
             res.status(500).json({ error: "An AI generation error occurred. Please check your API key, model name, and network connection.", details: error.message });
        } else {
            res.status(500).json({ error: "An unexpected server error occurred while generating the trip plan. Please check server logs.", details: error.message });
        }
    }
});

module.exports = router;