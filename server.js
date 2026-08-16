const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");

const app = express();

/* =========================
   CẤU HÌNH SERVER
========================= */

app.use(cors({
    origin: [
        "https://napthehungakira.github.io"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   THÔNG TIN API
========================= */

// Partner ID lấy theo thông tin tài khoản bạn gửi
const PARTNER_ID = process.env.PARTNER_ID;

// Partner Key KHÔNG được ghi trực tiếp vào code
const PARTNER_KEY = process.env.PARTNER_KEY;

const API_URL =
    process.env.API_URL ||
    "https://gachthe1s.com/chargingws/v2";

const PORT = process.env.PORT || 3000;

/* =========================
   KIỂM TRA ENV
========================= */

if (!PARTNER_ID || !PARTNER_KEY) {
    console.error(
        "❌ Thiếu PARTNER_ID hoặc PARTNER_KEY trong Environment Variables."
    );
}

/* =========================
   GÓI NẠP ĐƯỢC PHÉP
========================= */

const ALLOWED_AMOUNTS = [
    "50000",
    "100000",
    "200000",
    "500000"
];

/* =========================
   NHÀ MẠNG ĐƯỢC PHÉP
========================= */

const ALLOWED_TELCOS = [
    "VIETTEL",
    "GARENA",
    "MOBIFONE",
    "VINAPHONE"
];

/* =========================
   TRANG KIỂM TRA SERVER
========================= */

app.get("/", (req, res) => {
    res.json({
        status: 1,
        message: "Hùng Akira API đang hoạt động."
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: 1,
        server: "online",
        partner_configured: Boolean(
            PARTNER_ID && PARTNER_KEY
        ),
        time: new Date().toISOString()
    });
});

/* =========================
   HÀM TẠO REQUEST ID
========================= */

function createRequestId() {
    return (
        "FF_" +
        Date.now() +
        "_" +
        crypto.randomBytes(4).toString("hex")
    );
}

/* =========================
   HÀM TẠO CHỮ KÝ
========================= */

function createSign({
    code,
    command,
    partnerId,
    requestId,
    serial,
    telco
}) {
    const rawSign =
        PARTNER_KEY +
        code +
        command +
        partnerId +
        requestId +
        serial +
        telco;

    return crypto
        .createHash("md5")
        .update(rawSign, "utf8")
        .digest("hex");
}

/* =========================
   API NẠP THẺ
========================= */

app.post("/api/nap-the", async (req, res) => {

    try {

        /* -------------------------
           KIỂM TRA CẤU HÌNH
        ------------------------- */

        if (!PARTNER_ID || !PARTNER_KEY) {
            return res.status(500).json({
                status: 0,
                message:
                    "Server chưa cấu hình Partner ID/Partner Key."
            });
        }

        /* -------------------------
           LẤY DỮ LIỆU
        ------------------------- */

        const uid = String(
            req.body.uid || ""
        ).trim();

        const telco = String(
            req.body.telco || ""
        ).trim().toUpperCase();

        const code = String(
            req.body.code || ""
        ).trim();

        const serial = String(
            req.body.serial || ""
        ).trim();

        const amount = String(
            req.body.amount || ""
        ).trim();

        /* -------------------------
           KIỂM TRA UID
        ------------------------- */

        if (!uid) {
            return res.status(400).json({
                status: 0,
                message: "Vui lòng nhập UID."
            });
        }

        if (!/^[0-9]+$/.test(uid)) {
            return res.status(400).json({
                status: 0,
                message: "UID chỉ được chứa số."
            });
        }

        if (uid.length < 5 || uid.length > 20) {
            return res.status(400).json({
                status: 0,
                message: "UID không hợp lệ."
            });
        }

        /* -------------------------
           KIỂM TRA NHÀ MẠNG
        ------------------------- */

        if (!ALLOWED_TELCOS.includes(telco)) {
            return res.status(400).json({
                status: 0,
                message: "Nhà mạng không hợp lệ."
            });
        }

        /* -------------------------
           KIỂM TRA MÃ THẺ
        ------------------------- */

        if (!code) {
            return res.status(400).json({
                status: 0,
                message: "Vui lòng nhập mã thẻ."
            });
        }

        if (!/^[0-9]+$/.test(code)) {
            return res.status(400).json({
                status: 0,
                message: "Mã thẻ chỉ được chứa số."
            });
        }

        /* -------------------------
           KIỂM TRA SERIAL
        ------------------------- */

        if (!serial) {
            return res.status(400).json({
                status: 0,
                message: "Vui lòng nhập serial."
            });
        }

        if (!/^[0-9]+$/.test(serial)) {
            return res.status(400).json({
                status: 0,
                message: "Serial chỉ được chứa số."
            });
        }

        /* -------------------------
           KIỂM TRA MỆNH GIÁ
        ------------------------- */

        if (!ALLOWED_AMOUNTS.includes(amount)) {
            return res.status(400).json({
                status: 0,
                message: "Mệnh giá không được hỗ trợ."
            });
        }

        /* -------------------------
           TẠO REQUEST ID
        ------------------------- */

        const request_id = createRequestId();

        const command = "charging";

        /* -------------------------
           TẠO SIGN
        ------------------------- */

        const sign = createSign({
            code,
            command,
            partnerId: PARTNER_ID,
            requestId: request_id,
            serial,
            telco
        });

        /* -------------------------
           TẠO FORM DATA
        ------------------------- */

        const params = new URLSearchParams();

        params.append(
            "command",
            command
        );

        params.append(
            "partner_id",
            PARTNER_ID
        );

        params.append(
            "request_id",
            request_id
        );

        params.append(
            "telco",
            telco
        );

        params.append(
            "amount",
            amount
        );

        params.append(
            "serial",
            serial
        );

        params.append(
            "code",
            code
        );

        params.append(
            "sign",
            sign
        );

        /* -------------------------
           GỌI API ĐỐI TÁC
        ------------------------- */

        console.log(
            `[${request_id}] Gửi yêu cầu charging`
        );

        const response = await axios.post(
            API_URL,
            params.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                timeout: 15000,

                validateStatus: () => true
            }
        );

        /* -------------------------
           LOG KẾT QUẢ
        ------------------------- */

        console.log(
            `[${request_id}] HTTP:`,
            response.status
        );

        console.log(
            `[${request_id}] Response:`,
            response.data
        );

        /* -------------------------
           API TRẢ LỖI HTTP
        ------------------------- */

        if (
            response.status < 200 ||
            response.status >= 300
        ) {
            return res.status(502).json({
                status: 0,
                message:
                    "API đối tác trả về lỗi HTTP.",
                request_id,
                http_status:
                    response.status,
                data:
                    response.data
            });
        }

        /* -------------------------
           TRẢ KẾT QUẢ CHO WEBSITE
        ------------------------- */

        return res.status(200).json({
            ...response.data,
            request_id
        });

    } catch (error) {

        console.error(
            "❌ Lỗi /api/nap-the:",
            error.message
        );

        if (error.code === "ECONNABORTED") {
            return res.status(504).json({
                status: 0,
                message:
                    "API đối tác phản hồi quá lâu. Vui lòng thử lại sau."
            });
        }

        if (error.response) {

            console.error(
                "API error response:",
                error.response.data
            );

            return res.status(502).json({
                status: 0,
                message:
                    "API đối tác trả về lỗi.",
                data:
                    error.response.data
            });
        }

        return res.status(502).json({
            status: 0,
            message:
                "Không thể kết nối tới API đối tác."
        });
    }
});

/* =========================
   CALLBACK
========================= */

/*
   Endpoint này dành cho callback từ hệ thống
   đối tác nếu tài liệu API yêu cầu callback.

   KHÔNG tự suy đoán chữ ký callback.
   Nếu Gachthe1s yêu cầu xác thực callback,
   cần dùng đúng công thức trong tài liệu API.
*/

app.post("/api/callback", async (req, res) => {

    try {

        console.log(
            "========== CALLBACK =========="
        );

        console.log(
            "Callback data:",
            req.body
        );

        console.log(
            "=============================="
        );

        return res.json({
            status: 1,
            message: "Callback received."
        });

    } catch (error) {

        console.error(
            "Callback error:",
            error.message
        );

        return res.status(500).json({
            status: 0,
            message: "Callback error."
        });
    }
});

/* =========================
   XỬ LÝ ROUTE KHÔNG TỒN TẠI
========================= */

app.use((req, res) => {

    res.status(404).json({
        status: 0,
        message: "API endpoint không tồn tại."
    });

});

/* =========================
   KHỞI ĐỘNG SERVER
========================= */

app.listen(PORT, () => {

    console.log(
        `✅ Server đang chạy tại port ${PORT}`
    );

    console.log(
        `Partner ID: ${PARTNER_ID || "CHƯA CẤU HÌNH"}`
    );

    console.log(
        `Partner Key: ${
            PARTNER_KEY
                ? "ĐÃ CẤU HÌNH"
                : "CHƯA CẤU HÌNH"
        }`
    );

});
