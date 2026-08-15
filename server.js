const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Sử dụng đúng Partner ID và Partner Key từ trang quản trị The9p của bạn
const PARTNER_ID = "85251846982";
const PARTNER_KEY = "43092bddb54714b17e52d92047f3868c";

// Endpoint nhận dữ liệu từ giao diện web của bạn
app.post('/api/nap-the', async (req, res) => {
    try {
        const { telco, code, serial, amount, uid } = req.body;

        if (!telco || !code || !serial || !amount || !uid) {
            return res.json({ status: 0, message: 'Vui lòng nhập đầy đủ thông tin!' });
        }

        const request_id = "FF_" + Date.now() + Math.floor(Math.random() * 900 + 100);
        const command = "charging";

        // Tạo chữ ký (signature) bảo mật bằng thuật toán MD5
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

        // Gửi request sang hệ thống The9p
        const response = await axios.post('https://www.the9p.com/chargingws/v2', params);
        return res.json(response.data);

    } catch (error) {
        console.error("Lỗi server:", error.message);
        return res.json({ status: 0, message: 'Lỗi kết nối đến cổng thanh toán The9p!' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
