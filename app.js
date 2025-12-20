function drawHybridMuzzle(landmarks, roi) {
    // 座標変換関数
    const toGlobal = (lm) => ({
        x: roi.x + (lm.x * roi.w),
        y: roi.y + (lm.y * roi.h),
        z: lm.z * roi.w // ZスケールもROI基準に補正
    });

    const noseTip = toGlobal(landmarks[4]);  // 鼻先
    const jawL = toGlobal(landmarks[234]);   // 左頬
    const jawR = toGlobal(landmarks[454]);   // 右頬
    const eyeL = toGlobal(landmarks[33]);
    const eyeR = toGlobal(landmarks[263]);

    // 1. 顔の向き（Yaw）の計算
    const faceCenterX = (jawL.x + jawR.x) / 2;
    const faceWidth2D = Math.abs(jawR.x - jawL.x);
    const yawFactor = (noseTip.x - faceCenterX) / (faceWidth2D / 2); // -1.0(左) ～ 1.0(右)

    // 2. 奥行きを考慮した絶対顔幅
    const faceWidth3D = Math.hypot(jawR.x - jawL.x, (jawR.z - jawL.z));
    
    // 3. 回転角（Roll）
    const angle = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);

    // 4. サイズ計算
    const aspectRatio = muzzleImg.width / muzzleImg.height;
    
    // 【改善】横を向くほど全体を巨大化させ、鼻の厚みを飲み込む
    const expansion = 1.0 + Math.abs(yawFactor) * 0.45; // 最大1.45倍まで拡大
    const baseSize = faceWidth3D * 0.85 * expansion;
    
    // 【改善】横幅の圧縮率を緩め、手前側のカバー範囲を確保
    const squeezeFactor = Math.max(0.55, Math.cos(yawFactor * (Math.PI / 2.2)));
    const targetWidth = baseSize * squeezeFactor;
    const targetHeight = baseSize / aspectRatio;

    // 5. 【最重要】手前の鼻を隠すためのフロント・プッシュ・オフセット
    // 奥側の回り込み（wrapAround）と、手前側を隠すための大きな突き出し（frontPush）
    const wrapAround = yawFactor * baseSize * 0.3; 
    const frontPush = yawFactor * baseSize * 0.25; // 顔が向いている方向へマズルを突き出す
    const totalXOffset = wrapAround + frontPush;
    
    // 垂直方向の微調整（小鼻の下側を隠す）
    const yOffset = targetHeight * 0.18;

    ctx.save();
    
    // 鼻先に描画座標を合わせる
    ctx.translate(noseTip.x, noseTip.y);
    
    // 顔の傾き
    ctx.rotate(angle);

    // 6. 描画実行
    ctx.globalAlpha = 1.0; // 完全に不透明にして地肌を隠す
    
    ctx.drawImage(
        muzzleImg, 
        -targetWidth / 2 + totalXOffset, 
        -targetHeight / 2 + yOffset, 
        targetWidth, 
        targetHeight
    );
    
    ctx.restore();
}