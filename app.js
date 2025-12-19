import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('hiddenVideo');
const status = document.getElementById('status');
const loadingOverlay = document.getElementById('loadingOverlay');
const actionArea = document.getElementById('actionArea');
const downloadBtn = document.getElementById('downloadBtn');

let faceLandmarker;
let muzzleImg = new Image();
// 代替用の猫マズルBase64画像（透過PNG）
muzzleImg.src = "https://raw.githubusercontent.com/google/mediapipe/master/mediapipe/modules/face_geometry/data/face_paint_texture.png"; 
// ※実際にはより適切な猫のマズル透過PNGを muzzle.png として用意し、そちらを指定してください。

// 1. モデルの初期化
async function setupModel() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 2
    });
    status.innerText = "モデル準備完了。画像または動画を選択してください。";
}

// 2. マズルの描画
function drawMuzzle(landmarks) {
    // 鼻の中心 (Landmark 4)
    const nose = landmarks[4];
    // 顔のスケール算出 (両頬の距離)
    const jawRight = landmarks[234];
    const jawLeft = landmarks[454];
    const faceWidth = Math.hypot(jawLeft.x - jawRight.x, jawLeft.y - jawRight.y) * canvas.width;
    
    // 回転角の算出 (両目の傾き)
    const eyeR = landmarks[33];
    const eyeL = landmarks[263];
    const angle = Math.atan2(eyeL.y - eyeR.y, eyeL.x - eyeR.x);

    const muzzleSize = faceWidth * 0.6; // マズルのサイズを調整

    ctx.save();
    ctx.translate(nose.x * canvas.width, nose.y * canvas.height);
    ctx.rotate(angle);
    ctx.drawImage(muzzleImg, -muzzleSize/2, -muzzleSize/2, muzzleSize, muzzleSize);
    ctx.restore();
}

// 3. ファイル処理
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    loadingOverlay.style.display = 'flex';
    const url = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
        await processImage(url);
    } else if (file.type.startsWith('video/')) {
        await processVideo(url);
    }
});

async function processImage(url) {
    const img = new Image();
    img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const results = await faceLandmarker.detectForVideo(img, performance.now());
        if (results.faceLandmarks) {
            results.faceLandmarks.forEach(drawMuzzle);
        }
        
        loadingOverlay.style.display = 'none';
        actionArea.style.display = 'block';
        setupDownload(canvas.toDataURL('image/png'), 'result.png');
    };
    img.src = url;
}

async function processVideo(url) {
    video.src = url;
    video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            setupDownload(URL.createObjectURL(blob), 'result.webm');
            loadingOverlay.style.display = 'none';
            actionArea.style.display = 'block';
        };

        recorder.start();
        video.play();
        
        async function render() {
            if (video.paused || video.ended) {
                recorder.stop();
                return;
            }
            ctx.drawImage(video, 0, 0);
            const results = await faceLandmarker.detectForVideo(video, performance.now());
            if (results.faceLandmarks) {
                results.faceLandmarks.forEach(drawMuzzle);
            }
            requestAnimationFrame(render);
        }
        render();
    };
}

function setupDownload(url, filename) {
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };
}

// 起動
setupModel();