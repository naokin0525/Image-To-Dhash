// 画像からピクセルデータを取得する関数
function getImageDataFromImage(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// 指定したチャンネル（R, G, B）の差分ハッシュを計算する関数
function computeDHash(imageData, channel) {
    const width = imageData.width;
    const height = imageData.height;
    let hash = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const index = (y * width + x) * 4;
            const nextIndex = index + 4;

            const currentValue = imageData.data[index + channel];
            const nextValue = imageData.data[nextIndex + channel];

            hash += currentValue > nextValue ? '1' : '0';
        }
    }
    return hash;
}

// 画像データからRGBそれぞれのハッシュを計算する関数
function computeHashesForImage(imageData) {
    const rHash = computeDHash(imageData, 0); // Red channel
    const gHash = computeDHash(imageData, 1); // Green channel
    const bHash = computeDHash(imageData, 2); // Blue channel

    return { rHash, gHash, bHash };
}

// WebGLでハッシュを描画する関数
function renderHash(gl, hash, color) {
    const width = Math.sqrt(hash.length);
    const height = width;
    const positions = [];

    // シェーダープログラムの作成
    const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec3 v_color;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_color = vec3(${color});
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        varying vec3 v_color;
        void main() {
            gl_FragColor = vec4(v_color, 1.0);
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    // ハッシュを描画する四角形の座標を計算
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (hash[y * width + x] === '1') {
                const x1 = (x / width) * 2 - 1;
                const y1 = (y / height) * 2 - 1;
                const x2 = ((x + 1) / width) * 2 - 1;
                const y2 = ((y + 1) / height) * 2 - 1;

                positions.push(x1, y1, x2, y1, x1, y2);
                positions.push(x2, y1, x1, y2, x2, y2);
            }
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
}

// シェーダーを作成する関数
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// WebGLプログラムを作成する関数
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// アップロードされた画像をキャンバスに描画し、ハッシュを表示する関数
function drawHashesToCanvas(image) {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl");

    const imageData = getImageDataFromImage(image);
    const { rHash, gHash, bHash } = computeHashesForImage(imageData);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderHash(gl, rHash, '1.0, 0.0, 0.0'); // Red
    renderHash(gl, gHash, '0.0, 1.0, 0.0'); // Green
    renderHash(gl, bHash, '0.0, 0.0, 1.0'); // Blue
}

// ファイルアップロードのイベントリスナー
document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const image = new Image();
    image.onload = function() {
        drawHashesToCanvas(image);
    };
    image.src = URL.createObjectURL(file);
});
