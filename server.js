async function submitOrder() {
    const uid = document.getElementById("uid").value.trim();
    const cardCode = document.getElementById("cardCode").value.trim();
    const serial = document.getElementById("serial").value.trim();
    const result = document.getElementById("result");
    const submitBtn = document.getElementById("submitBtn");

    if (!isUidVerified || !uid) {
        alert("Vui lòng kiểm tra và xác thực UID trước.");
        return;
    }

    if (!cardCode || !serial) {
        alert("Vui lòng nhập đầy đủ mã thẻ và serial!");
        return;
    }

    result.style.display = "block";
    result.style.background = "#fff8e1";
    result.style.color = "#795500";
    result.innerHTML = "⏳ Đang gửi yêu cầu...";

    submitBtn.disabled = true;

    try {
        const response = await fetch(
            "https://napthehungakira.onrender.com/api/nap-the",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uid: uid,
                    telco: selectedTelco,
                    code: cardCode,
                    serial: serial,
                    amount: selectedPackage.amount
                })
            }
        );

        let data;

        try {
            data = await response.json();
        } catch (e) {
            throw new Error("Server trả về dữ liệu không hợp lệ");
        }

        submitBtn.disabled = false;

        const message =
            data.message ??
            data.msg ??
            data.error ??
            data.status ??
            "Không có phản hồi từ server";

        const success =
            data.status === 1 ||
            data.status === "1" ||
            data.success === true;

        if (success) {
            result.style.background = "#eefbf0";
            result.style.color = "#20752b";

            result.innerHTML =
                "✅ Nạp thành công<br>" +
                escapeHTML(message);
        } else {
            result.style.background = "#fde8e8";
            result.style.color = "#c93832";

            result.innerHTML =
                "❌ Nạp thất bại<br>" +
                escapeHTML(message);
        }

    } catch (error) {

        submitBtn.disabled = false;

        result.style.display = "block";
        result.style.background = "#fde8e8";
        result.style.color = "#c93832";

        result.innerHTML =
            "❌ Không kết nối được server<br>" +
            escapeHTML(
                error.message || "Lỗi không xác định"
            );
    }
}
