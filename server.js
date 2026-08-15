const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PARTNER_ID = "26920986864";
const PARTNER_KEY = "b80a0d9c3757f2b8e8ae04c47fcaef51";

app.post('/charging', async (req, res) => {
    try {
        const { telco, code, serial, amount, uid } = req.body;

        if (!telco || !code || !serial || !amount || !uid) {
            return res.json({ status: 0, message: 'Vui lòng nhập đầy đủ thông tin!' });
        }

        const request_id = "FF_" + Date.now() + Math.floor(Math.random() * 900 + 100);
        const command = "charging";

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

        const response = await axios.post('https://www.the9p.com/chargingws/v2', params);
        res.json(response.data);

    } catch (error) {
        res.json({ status: 0, message: 'Lỗi kết nối máy chủ thanh toán!' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
