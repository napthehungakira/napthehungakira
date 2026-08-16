const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Đã sửa đúng Partner Key khớp hoàn toàn với Gachthe1s
const PARTNER_ID = "2836866755";
const PARTNER_KEY = "e3c434a49e4b1279f0dc40a6b7e07a9e";

app.post('/api/nap-the', async (req, res) => {
    try {
        const { telco, code, serial, amount, uid } = req.body;

        if (!telco || !code || !serial || !amount || !uid) {
            return res.json({ status: 0, message: 'Vui lòng nhập đầy đủ thông tin!' });
        }

        const request_id = "FF_" + Date.now() + Math.floor(Math.random() * 900 + 100);
        const command = "charging";

        // Tạo chữ ký MD5 chuẩn theo API gạch thẻ
        const rawSign = PARTNER_KEY + code + command + PARTNER_ID + request_id + serial + telco;
        const sign = crypto.createHash('md5').update(rawSign).digest('hex');

        const params = new URLSearchParams({
            command,
            partner_id: PARTNER_ID,
            request_id,
            telco,
            amount,
            serial,
            code,
            sign
        });

        // Endpoint chính thức của hệ thống Gachthe1s
        const response = await axios.post('https://gachthe1s.com/chargingws/v2', params);
        return res.json(response.data);

    } catch (error) {
        console.error("Lỗi server:", error.message);
        return res.json({ status: 0, message: 'Lỗi kết nối đến cổng thanh toán Gachthe1s!' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
