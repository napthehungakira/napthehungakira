const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lấy thông tin API từ Render Environment Variables
const PARTNER_ID = process.env.PARTNER_ID;
const PARTNER_KEY = process.env.PARTNER_KEY;

app.get("/", (req, res) => {
    res.json({
        status: 1,
        message: "API server đang hoạt động"
    });
});

app.post("/api/nap-the", async (req, res) => {
    try {
        const {
            telco,
            code,
            serial,
            amount,
            uid
        } = req.body;

        if (!PARTNER_ID || !PARTNER_KEY) {
            return res.status(500).json({
                status: 0,
                message: "Server chưa cấu hình PARTNER_ID/PARTNER_KEY"
            });
        }

        if (!telco || !code || !serial || !amount || !uid) {
            return res.json({
                status: 0,
                message: "Vui lòng nhập đầy đủ thông tin!"
            });
        }

        const request_id =
            "FF_" +
            Date.now() +
            Math.floor(Math.random() * 900 + 100);

        const command = "charging";

        const rawSign =
            PARTNER_KEY +
            code +
            command +
            PARTNER_ID +
            request_id +
            serial +
            telco;

        const sign = crypto
            .createHash("md5")
            .update(rawSign)
            .digest("hex");

        const params = new URLSearchParams();

        params.append("command", command);
        params.append("partner_id", PARTNER_ID);
        params.append("request_id", request_id);
        params.append("telco", telco);
        params.append("amount", String(amount));
        params.append("serial", serial);
        params.append("code", code);
        params.append("sign", sign);

        const response = await axios.post(
            "https://gachthe1s.com/chargingws/v2",
            params.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                timeout: 30000
            }
        );

        console.log("API Gachthe1s:", response.data);

        return res.json(response.data);

    } catch (error) {

        console.error(
            "Lỗi API:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            status: 0,
            message:
                error.response?.data?.message ||
                error.message ||
                "Lỗi kết nối API"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
