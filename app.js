// --- 手前側の小鼻を隠すための強化版3D描画ロジック ---
function drawMuzzle3D(landmarks) {
    if (!muzzleReady) return;

    const noseTip = landmarks[4];      // 鼻先
    const jawL = landmarks[234];       // 左頬
    const jawR = landmarks[454];       // 右頬
    const eyeL = landmarks[33];
    const eyeR = landmarks[263];

    // 1. 顔の向き（Yaw）の計算: -1.0 (左向き) ～ 1.0 (右向き)
    const faceCenterX = (jawL.x + jawR.x) / 2;
    const faceWidth2D = Math.abs(jawR.x - jawL.x);
    const yawFactor = (noseTip.x - faceCenterX) / (faceWidth2D / 2);

    // 2. 3Dスケール（奥行きを考慮した絶対サイズ）
    const faceWidth3D = Math.hypot(jawR.x - jawL.x, jawR.z - jawL.z) * canvas.width;
    
    // 3. 回転角（Roll）
    const angle = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);

    // 4. サイズ計算
    const aspectRatio = muzzleImg.width / muzzleImg.height;
    
    // 【改善】横を向くほどベースサイズを大きくする（手前を隠すためのマージン）
    const expansionFactor = 1.0 + Math.abs(yawFactor) * 0.25; 
    const baseSize = faceWidth3D * 0.85 * expansionFactor;
    
    // 横幅の圧縮率（最小幅を少し広げてカバー力を確保）
    const squeezeFactor = Math.max(0.45, Math.cos(yawFactor * (Math.PI / 2.2)));
    const targetWidth = baseSize * squeezeFactor;
    const targetHeight = baseSize / aspectRatio;

    // 5. 【重要】手前と奥の両方を隠すためのダブル・オフセット
    // wrapAround: 奥側を隠すための回り込み
    const wrapAround = yawFactor * baseSize * 0.25;
    // foregroundPush: 手前側の小鼻を隠すために、向いている方向へさらに押し出す
    const foregroundPush = yawFactor * baseSize * 0.15;
    const totalXOffset = wrapAround + foregroundPush;
    
    ctx.save();
    
    // 鼻先の座標
    const x = noseTip.x * canvas.width;
    const y = noseTip.y * canvas.height;
    ctx.translate(x, y);
    
    // 顔の傾きに合わせる
    ctx.rotate(angle);

    // 6. 描画
    // 少し不透明度を上げて完全に隠す
    ctx.globalAlpha = 1.0; 
    
    ctx.drawImage(
        muzzleImg, 
        -targetWidth / 2 + totalXOffset, // 計算されたオフセットを適用
        -targetHeight / 2 + (targetHeight * 0.15), // 鼻の下を隠すため少し下げる
        targetWidth, 
        targetHeight
    );
    
    ctx.restore();
}