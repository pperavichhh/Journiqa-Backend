const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs'); // Node.js File System module
const path = require('path'); // Node.js Path module

const { authenticateToken } = require('./auth'); // สมมติว่า auth.js อยู่ในโฟลเดอร์เดียวกัน
const Trip = require('../models/trip'); // นำเข้า Trip Model
const tripPromptPath = path.join(__dirname, '../prompts/prompt.txt');
const basePrompt = fs.readFileSync(tripPromptPath, 'utf8');

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not set. Some routes might not function correctly.");
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
    // ใช้ 'Bangkok Central Business District' เพื่อความแม่นยำในการค้นหาในกรุงเทพฯ
    const fullPlaceQuery = `${placeName.toLowerCase().trim()},bangkok central business district`;
    const cacheKey = fullPlaceQuery;

    // Check cache first
    if (nominatimCache[cacheKey] && (Date.now() - nominatimCache[cacheKey].timestamp < CACHE_TTL_MS)) {
        console.log(`[Nominatim Cache] Serving '${placeName}' from cache.`);
        return nominatimCache[cacheKey].data;
    }

    try {
        const query = encodeURIComponent(fullPlaceQuery);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

        const response = await axios.get(url, {
            headers: {
                // *** สำคัญมาก: แทนที่ด้วยอีเมลจริงของคุณ เพื่อให้เป็นไปตามนโยบายของ Nominatim ***
                'User-Agent': 'GeminiTripPlanner/1.0 (your.actual.email@example.com)'
            }
        });
        const data = response.data;

        if (data && data.length > 0) {
            const result = data[0];
            const placeDetails = {
                // อาจจะต้องปรับ logic การดึงชื่อหลักให้ดีขึ้น ถ้า result.display_name ไม่ใช่ชื่อที่ต้องการเสมอไป
                name: result.name || result.display_name.split(',')[0].trim(),
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
        if (error.response && error.response.status === 403) {
            console.error("Nominatim 403 Error: ตรวจสอบให้แน่ใจว่า User-Agent header (your.actual.email@example.com) เป็นอีเมลที่ไม่ซ้ำและถูกต้อง");
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
    // เพิ่ม 'T00:00:00' เพื่อให้การตีความวันที่สอดคล้องกัน (UTC start of day)
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

    // Basic input validation
    if (!start_date || !end_date || !interests || !budget || !travel_style) {
        return res.status(400).json({ error: "ข้อมูลที่จำเป็นไม่ครบถ้วน กรุณาตรวจสอบว่าคุณได้ระบุข้อมูลทั้งหมดแล้ว" });
    }

    try {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        const timeDiff = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const numDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 เพื่อรวมทั้งวันเริ่มต้นและวันสิ้นสุด

        // สร้าง Prompt แบบ Dynamic
        const prompt = basePrompt
            .replace('{start_date}', start_date)
            .replace('{end_date}', end_date)
            .replace('{numDays}', numDays)
            .replace('{interests}', interests.join(', '))
            .replace('{budget}', budget)
            .replace('{travel_style}', travel_style);

        console.log("กำลังส่ง Prompt ไปยัง Gemini...");
        const geminiResponse = await geminiModel.generateContent(prompt);
        let responseText = geminiResponse.response.text();

        // ลบ Markdown code block wrappers (```json หรือ ```) ออก
        if (responseText.startsWith("```json")) {
            responseText = responseText.substring(7, responseText.lastIndexOf("```")).trim();
        } else if (responseText.startsWith("```")) {
             responseText = responseText.substring(3, responseText.lastIndexOf("```")).trim();
        }

        let generatedPlan;
        try {
            generatedPlan = JSON.parse(responseText);
            if (!generatedPlan.plan) {
                // ถ้า Gemini คืนค่า JSON ที่ถูกต้อง แต่ไม่มี key 'plan'
                throw new Error("การตอบกลับของ Gemini เป็น JSON ที่ถูกต้อง แต่ไม่มี key 'plan' Raw response: " + responseText.substring(0, 200));
            }
        } catch (parseError) {
            console.error("ไม่สามารถ Parse การตอบกลับของ Gemini เป็น JSON ได้. Raw response:", responseText);
            console.error("ข้อผิดพลาดในการ Parse:", parseError.message);
            return res.status(500).json({
                error: "ไม่สามารถสร้างแผนที่ถูกต้องจาก AI ได้ การตอบกลับของ AI ไม่อยู่ในรูปแบบ JSON ที่คาดหวัง กรุณาลองอีกครั้งหรือปรับปรุงคำถาม",
                ai_raw_response: responseText.substring(0, 500) // แสดงส่วนหนึ่งของการตอบกลับเพื่อการ Debug
            });
        }

        // เพิ่มข้อมูล Location จาก Nominatim ให้กับแผน
        const enrichedPlan = [];
        for (const dayPlan of generatedPlan.plan) {
            const enrichedActivities = [];
            for (const activity of dayPlan.activities) {
                const placeName = activity.name;
                if (placeName) {
                    const nominatimDetails = await getPlaceDetailsFromNominatim(placeName);
                    if (nominatimDetails) {
                        // เพิ่ม location (lat/lng) และ OSM URL ไปยัง object กิจกรรม
                        Object.assign(activity, {
                            location: nominatimDetails.location,
                            osm_url: nominatimDetails.osm_url
                        });
                    }
                    // สำคัญสำหรับ Nominatim rate limits: หน่วงเวลาระหว่าง Request สำหรับรายการที่ยังไม่ได้ Cache
                    // รายการที่ Cache ไว้แล้วจะข้ามขั้นตอนนี้ไป ทำให้การค้นหาครั้งต่อไปเร็วขึ้น
                    if (!nominatimCache[`${placeName.toLowerCase().trim()},bangkok central business district`] ||
                        (Date.now() - nominatimCache[`${placeName.toLowerCase().trim()},bangkok central business district`].timestamp >= CACHE_TTL_MS)) {
                        await new Promise(resolve => setTimeout(resolve, 1100)); // หน่วงเวลา 1.1 วินาที สำหรับ Request ที่ไม่ได้ Cache
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

        // Object สำหรับ Response สุดท้าย
        const responseData = {
            trip_id: `trip-${Date.now()}`, // ID ชั่วคราวสำหรับ Frontend (ยังไม่ใช่ ID จาก MongoDB)
            destination: "Bangkok Central Business District", // Destination ที่เป็นค่าเริ่มต้นหรือที่คาดไว้
            start_date: start_date,
            end_date: end_date,
            plan: enrichedPlan,
            notes: "แผนที่สร้างขึ้นเป็นข้อเสนอแนะเท่านั้น รายละเอียดสถานที่ได้มาจาก OpenStreetMap โปรดตรวจสอบรายละเอียด, เวลาทำการ, และเวลาเดินทางอีกครั้งก่อนการเดินทางของคุณ รูปภาพสถานที่ไม่มีให้บริการจาก Nominatim."
        };

        res.json(responseData);

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการประมวลผลคำขอสร้างแผนทริป:", error);
        // แยกแยะข้อผิดพลาดจาก AI generation และข้อผิดพลาดอื่นๆ
        if (error.name === 'GoogleGenerativeAIFetchError') {
             res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างแผนด้วย AI กรุณาตรวจสอบ API key, ชื่อ Model, และการเชื่อมต่อเครือข่ายของคุณ", details: error.message });
        } else {
            res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิดบนเซิร์ฟเวอร์ขณะสร้างแผนทริป กรุณาตรวจสอบ Log ของเซิร์ฟเวอร์", details: error.message });
        }
    }

    
});


router.post('/save-trip', authenticateToken, async (req, res) => {
    try {
        const {
            tripName,
            destination,
            startDate,
            endDate,
            duration,
            itinerary,
            status
        } = req.body;

        // การตรวจสอบข้อมูลพื้นฐานที่จำเป็นก่อนบันทึก
        if (!tripName || !destination || !startDate || !endDate || typeof duration === 'undefined' || !itinerary || !Array.isArray(itinerary)) {
            return res.status(400).json({ message: 'ข้อมูลทริปไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและแผนการเดินทาง' });
        }

        // สร้าง Trip document ใหม่
        const newTrip = new Trip({
            user: req.user.id, // User ID ที่ได้จาก authenticateToken
            tripName,
            destination,
            startDate,
            endDate,
            duration,
            itinerary,
            status: status || 'planned' 
        });

        // บันทึกทริปลงในฐานข้อมูล MongoDB
        await newTrip.save();

        res.status(201).json({ message: 'บันทึกทริปเรียบร้อยแล้ว!', trip: newTrip });

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกทริป:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด', errors });
        }
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะบันทึกทริป', error: error.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const trips = await Trip.find({ user: req.user.id }).sort({ createdAt: -1 }); // ดึงทริปทั้งหมดของผู้ใช้คนปัจจุบัน เรียงจากใหม่ไปเก่า
        res.status(200).json(trips);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลทริป:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลทริป', error: error.message });
    }
});


router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findOne({ _id: id, user: req.user.id }); // ค้นหาจาก ID และ User ID เพื่อความปลอดภัย

        if (!trip) {
            return res.status(404).json({ message: 'ไม่พบทริปนี้ หรือคุณไม่ได้รับอนุญาตให้เข้าถึง' });
        }

        res.status(200).json(trip);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลทริปเดียว:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลทริป', error: error.message });
    }
});


router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // รับข้อมูลที่ Frontend ส่งมาเพื่ออัปเดต
        const updatedTrip = await Trip.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { $set: updates }, 
            { new: true, runValidators: true } 
        );

        if (!updatedTrip) {
            return res.status(404).json({ message: 'ไม่พบทริปนี้ หรือคุณไม่ได้รับอนุญาตให้อัปเดต' });
        }

        res.status(200).json({ message: 'อัปเดตทริปเรียบร้อยแล้ว!', trip: updatedTrip });

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตทริป:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด', errors });
        }
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะอัปเดตทริป', error: error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTrip = await Trip.findOneAndDelete({ _id: id, user: req.user.id });

        if (!deletedTrip) {
            return res.status(404).json({ message: 'ไม่พบทริปนี้ หรือคุณไม่ได้รับอนุญาตให้ลบ' });
        }

        res.status(200).json({ message: 'ลบทริปเรียบร้อยแล้ว!', trip: deletedTrip });

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบทริป:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะลบทริป', error: error.message });
    }
});

module.exports = router;
