let socket;
let player;

const height = 300;
const width = 300;
const player_num = 5; //max player number

const button_height = "60px";
const button_width = "100px";

let buttons;
const button_answer = document.createElement("button");
const button_correct = document.createElement("button");
const button_wrong = document.createElement("button");
const button_question = document.createElement("button");

let upload_div;
const button_upload = document.createElement("input");

let disp;

const disp_img = document.createElement("img");

let obj_sound_answer = new Audio();
let obj_sound_correct = new Audio();
let obj_sound_wrong = new Audio();
let obj_sound_question = new Audio();

let clients = [];
let master_k1 = false;
let name = sessionStorage.getItem("name");
let div_player = [player_num];
let div_answer_button;
let div_master_button;

function init() {
  //base canvas
  const container = document.getElementById("container");
  container.style.position = "absolute";
  //container.style.height = `${height}px`;
  container.style.width = `${width}px`;
  container.style.backgroundColor = "#FFF";

  upload_div = document.getElementById("fileupload");

  button_upload.type = "file";
  button_upload.accept = "image/*";

  disp = document.getElementById("display");
  disp.style.position = "relative";
  disp.style.height = `${height}px`;
  disp.style.width = `${width}px`;
  disp.style.backgroundColor = "#FFF";
  disp.style.boxSizing = "border-box";
  disp.style.border = "3px solid black";

  buttons = document.getElementById("buttons");

  button_answer.innerText = "回答";
  button_answer.onclick = Answer;
  button_answer.style.height = button_height;
  button_answer.style.width = button_width;
  button_answer.style.touchAction = "manipulation";
  buttons.appendChild(button_answer);

  button_correct.innerText = "正解";
  button_correct.onclick = CorrectAnswer;
  button_correct.style.height = button_height;
  button_correct.style.width = button_width;

  button_wrong.innerText = "不正解";
  button_wrong.onclick = WrongAnswer;
  button_wrong.style.height = button_height;
  button_wrong.style.width = button_width;

  button_question.innerText = "出題";
  button_question.onclick = Question;
  button_question.style.height = button_height;
  button_question.style.width = button_width;

  for (let i = 0; i < player_num; i++) {
    div_player[i] = document.createElement("div");
    div_player[i].style.boxSizing = "border-box";
    div_player[i].style.border = "1px solid black";
    div_player[i].style.backgroundColor = "#FF0";
    div_player[i].style.fontSize = "small";
    container.appendChild(div_player[i]);
  }

  //接続
  socket = io();
  player = new Player(name, 0, false);

  //サーバーに送るデータ
  let data = {
    name: player.name,
    point: player.point,
    master: player.master
  };
  console.log("データ送信");
  socket.emit("start", data);

  //切断した場合
  socket.on("forceDisconnect", function () {
    window.location = "game_over.html";
    socket.disconnect();
  });
  //他のプレーヤーの情報を更新
  socket.on("heartbeat", update);
  //新規入室があったとき
  socket.on("new", function (data) {
    console.log("新規ユーザーが入室しました。");
  });
  socket.on("sound_answer", Sound_answer);
  socket.on("sound_correct", Sound_correct);
  socket.on("sound_wrong", Sound_wrong);
  socket.on("update_image", UpdateImage);
}

// 情報更新
function update(data) {
  clients = data;
  if (clients.length > 0) {
    // update player list
    for (let i = 0; i < player_num; i++) {
      div_player[i].textContent = `${i + 1}:`;
      div_player[i].style.backgroundColor = "#FF0";
    }
    // check self player
    for (let i = clients.length - 1; i >= 0; i--) {
      div_player[i].textContent = `${i + 1}: ${clients[i].name}, point: ${
        clients[i].point
      }, master: ${clients[i].master}`;
      if (socket.id === clients[i].id) {
        div_player[i].style.backgroundColor = "#F0F";
        if (clients[i].master && !master_k1) {
          ChangeMasterView();
        }
        master_k1 = clients[i].master;
      }
      if (clients[i].answering === true) {
        div_player[i].style.backgroundColor = "blue";
      }
    }
  }
}

function Answer() {
  socket.emit("answer", true);
  let someone_answering = false;
  for (let i = clients.length - 1; i >= 0; i--) {
    if (clients[i].answering === true) {
      someone_answering = true;
      console.log(`${clients[i].name} is answering`);
    }
  }
  if (!someone_answering) {
    console.log(`${player.name} is answering`);
  }
  obj_sound_answer = new Audio();
  obj_sound_correct = new Audio();
  obj_sound_wrong = new Audio();
  obj_sound_answer.src = "sound/answering.mp3";
  obj_sound_correct.src = "sound/correct.mp3";
  obj_sound_wrong.src = "sound/wrong.mp3";
  obj_sound_answer.muted = true;
  obj_sound_correct.muted = true;
  obj_sound_wrong.muted = true;

  obj_sound_correct.play();
  obj_sound_wrong.play();
}

function Sound_answer(data) {
  console.log("playing answer sound");
  obj_sound_answer.currentTime = 0;
  obj_sound_answer.muted = false;
  obj_sound_answer.play();
}

function CorrectAnswer() {
  socket.emit("correct", true);
}

function Sound_correct(data) {
  console.log("playing correct sound");
  obj_sound_correct.muted = false;
  obj_sound_correct.currentTime = 0;
  obj_sound_correct.play();
}

function WrongAnswer() {
  socket.emit("wrong", true);
}

function Sound_wrong(data) {
  console.log("playing wrong sound");
  obj_sound_wrong.muted = false;
  obj_sound_wrong.currentTime = 0;
  obj_sound_wrong.play();
}

function ChangeMasterView() {
  button_answer.remove();
  buttons.appendChild(button_correct);
  buttons.appendChild(button_wrong);
  buttons.appendChild(button_question);
  upload_div.appendChild(button_upload);
  button_upload.addEventListener("change", PreviewImage);
  player.master = true;
}

function PreviewImage() {
  let fileReader = new FileReader();
  var image_test = new Image();
  fileReader.onload = function () {
    disp_img.src = fileReader.result;
  };
  fileReader.readAsDataURL(button_upload.files[0]);
  disp_img.height = height - 6;
  disp_img.width = width - 6;
  disp_img.style.objectFit = "contain";
  disp.appendChild(disp_img);
}

function Question() {
  obj_sound_question = new Audio();
  obj_sound_question.src = "sound/question.mp3";
  obj_sound_question.play();

  let fileReader = new FileReader();
  console.log(disp_img);
  test = ImageToBase64(disp_img, "image/jpeg");
  //console.log(test);
  //fileReader.readAsDataURL(test);
  socket.emit("question", test);
}

function ImageToBase64(img, mime_type) {
  // New Canvas
  var canvas = document.createElement('canvas');
  canvas.width = img.width*2;
  canvas.height = img.height*2;
  // Draw Image
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);
  // To Base64
  return canvas.toDataURL(mime_type);
}


function UpdateImage(img_file) {
  //console.log(img_file);
  if (player.master === false) {
    disp_img.src = img_file;
    disp_img.height = height - 6;
    disp_img.width = width - 6;
    disp_img.style.objectFit = "contain";
    disp.appendChild(disp_img);
  }
}

window.onload = function () {
  console.log("onload");
  // ダブルタップズーム禁止
  document.addEventListener(
    "dblclick",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );
  init();
};
