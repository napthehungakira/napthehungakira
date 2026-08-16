const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// CONFIG
// ================================

const PORT = process.env.PORT || 3000;

const PARTNER_ID = process.env.PARTNER_ID;
const PARTNER_KEY = process.env.PARTNER_KEY;

const API_URL = "https://gachthe1s.com/chargingws/v2";

// ================================
// HEALTH CHECK
// ================================

app.get("/", (req, res) => {
    res.json({
        status: 1,
        message: "Hùng Akira API server đang hoạt động"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: 1,
        server: "online",
        partner_configured: Boolean(PARTNER_ID && PARTNER_KEY)
    });
});

// ================================
// NẠP THẺ
// ================================

app.post("/api/nap-the", async (req, res) => {
    try {
        const {
            telco,
            code,
            serial,
            amount,
            uid
        } = req.body;

        // ----------------------------
        // Kiểm tra cấu hình server
        // ----------------------------

        if (!PARTNER_ID || !PARTNER_KEY) {
            console.error("Thiếu PARTNER_ID hoặc PARTNER_KEY");

            return res.status(500).json({
                status: 0,
                success: false,
                message: "Server chưa được cấu hình Partner ID/Partner Key."
            });
        }

        // ----------------------------
        // Kiểm tra dữ liệu đầu vào
        // ----------------------------

        if (!uid || !telco || !code || !serial || !amount) {
            return res.status(400).json({
                status: 0,
                success: false,
                message: "Vui lòng nhập đầy đủ thông tin."
            });
        }

        // UID chỉ cho phép số
        if (!/^\d{5,20}$/.test(String(uid))) {
            return res.status(400).json({
                status: 0,
                success: false,
                message: "UID không hợp lệ."
            });
        }

        // ----------------------------
        // Chuẩn hóa dữ liệu
        // ----------------------------

        const normalizedTelco = String(telco).trim().toUpperCase();
        const normalizedCode = String(code).trim();
        const normalizedSerial = String(serial).trim();
        const normalizedAmount = String(amount).trim();

        const allowedTelcos = [
            "VIETTEL",
            "GARENA",
            "MOBIFONE",
            "VINAPHONE"
        ];

        if (!allowedTelcos.includes(normalizedTelco)) {
            return res.status(400).json({
                status: 0,
                success: false,
                message: "Nhà mạng không hợp lệ."
            });
        }

        // ----------------------------
        // Tạo request ID
        // ----------------------------

        const request_id =
            "FF_" +
            Date.now() +
            "_" +
            crypto.randomBytes(4).toString("hex");

        const command = "charging";

        // ----------------------------
        // Tạo chữ ký
        // ----------------------------

        const rawSign =
            PARTNER_KEY +
            normalizedCode +
            command +
            PARTNER_ID +
            request_id +
            normalizedSerial +
            normalizedTelco;

        const sign = crypto
            .createHash("md5")
            .update(rawSign)
            .digest("hex");

        // ----------------------------
        // Gửi API
        // ----------------------------

        const params = new URLSearchParams();

        params.append("command", command);
        params.append("partner_id", PARTNER_ID);
        params.append("request_id", request_id);
        params.append("telco", normalizedTelco);
        params.append("amount", normalizedAmount);
        params.append("serial", normalizedSerial);
        params.append("code", normalizedCode);
        params.append("sign", sign);

        console.log("Charging request:", {
            request_id,
            uid,
            telco: normalizedTelco,
            amount: normalizedAmount
        });

        const response = await axios.post(
            API_URL,
            params.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                timeout: 30000
            }
        );

        console.log(
            "Gachthe1s response:",
            response.data
        );

        // ----------------------------
        // Xử lý phản hồi
        // ----------------------------

        const data = response.data || {};

        const status = String(
            data.status ?? data.success ?? ""
        );

        const success =
            status === "1" ||
            data.status === 1 ||
            data.success === true;

        return res.status(200).json({
            status: success ? 1 : 0,
            success,
            message:
                data.message ||
                data.msg ||
                "Hệ thống đã nhận phản hồi.",
            request_id,
            provider_response: data
        });

    } catch (error) {

        console.error(
            "API ERROR:",
            error.response?.data || error.message
        );

        if (error.response) {
            return res.status(502).json({
                status: 0,
                success: false,
                message:
                    error.response.data?.message ||
                    error.response.data?.msg ||
                    "Cổng thanh toán trả về lỗi.",
                provider_response:
                    error.response.data || null
            });
        }

        return res.status(500).json({
            status: 0,
            success: false,
            message:
                "Không thể kết nối tới cổng thanh toán."
        });
    }
});

// ================================
// 404
// ================================

app.use((req, res) => {
    res.status(404).json({
        status: 0,
        message: "Không tìm thấy API."
    });
});

// ================================
// START
// ================================

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        "Partner ID configured:",
        Boolean(PARTNER_ID)
    );

    console.log(
        "Partner Key configured:",
        Boolean(PARTNER_KEY)
    );
});
