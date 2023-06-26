// Express
const express = require("express"),
  https = require("http"),
  app = express();

// system
app.use(express.static(__dirname + '/public'));
const server = https.createServer(app).listen(8080);
console.log("server start!!:", 8080);

let socket = require("socket.io");
let io = socket(server);
io.sockets.on("connection", newConnection);

const cv = require("opencv.js");
const Jimp = require("jimp");

let clients = [];

let interval_1sec;
let img_org;
let i_bokasi = 100;

//各クライアントのデータを全員に送信するループ
setInterval(heartbeat, 50);

function heartbeat() {
  io.sockets.emit("heartbeat", clients);
}

function Player(id, name, point, master) {
  this.id = id;
  this.name = name;
  this.point = point;
  this.master = master;
  this.answering = false;
}

function newConnection(socket) {
  console.log("新規のクライアントが入室しました :" + socket.id);
  io.sockets.emit("new", clients);

  //断線の場合
  socket.on("disconnect", function (msg) {
    let delete_id = null;
    let master_disconnect = false;
    console.log(clients);
    for (let i = clients.length - 1; i >= 0; i--) {
      if (clients[i].id === socket.id) {
        console.log(
          "id: " +
            socket.id +
            " name: " +
            clients[i].name +
            " point: " +
            clients[i].point +
            " master: " +
            clients[i].master
        );
        delete_id = i;
        if (clients[i].master === true && clients.length > 1) {
          master_disconnect = true;
        }
      }
    }
    console.log("クライアントが退出しました :" + socket.id + " car :" + msg);
    if (delete_id !== null) {
      clients.splice(delete_id, 1);
    }
    if (master_disconnect === true) {
      clients[0].master = true;
      console.log(
        "マスターが" + clients[0].name + clients[0].id + "に引き継がれました。"
      );
    }
  });

  socket.on("start", starting);
  socket.on("answer", Answer);
  socket.on("correct", Correct);
  socket.on("wrong", Wrong);
  socket.on("question", Question);

  //クライアントテーブルへのplayerの追加
  function starting(data) {
    let master;
    if (clients.length > 0) {
      master = false;
    } else {
      master = true;
    }
    console.log(
      "id: " +
        socket.id +
        " name: " +
        data.name +
        " point: " +
        data.point +
        " master: " +
        master
    );
    let player = new Player(socket.id, data.name, data.point, master);
    clients.push(player);
  }

  // 回答要求の処理
  function Answer(data) {
    console.log(clients.indexOf(socket.id));
    console.log(socket.id);
    console.log(clients);
    // ぼかしの停止
    clearInterval(interval_1sec);
    let other_answring = false;
    clients.forEach(function (player) {
      if (player.answering === true) {
        other_answring = true;
      }
    });
    if (!other_answring) {
      clients.forEach(function (player) {
        if (player.id === socket.id) {
          console.log(`${player.name} is answering.`);
          player.answering = true;
        }
      });
      socket.emit("sound_answer", true);
    }
  }

  function Correct() {
    // Check if someone is answering
    clients.forEach(function (player) {
      if (player.answering === true) {
        console.log("正解！");
        player.answering = false;
        player.point++;
        io.to(player.id).emit("sound_correct", true);
        i_bokasi = 1;
        interval_1sec = setInterval(Update_bokasi, 500);
      }
    });
  }

  function Wrong() {
    // Check if someone is answering
    clients.forEach(function (player) {
      if (player.answering === true) {
        console.log("不正解！");
        player.answering = false;
        io.to(player.id).emit("sound_wrong", true);
      }
    });
  }

  function Question(img_base64) {
    if (i_bokasi < 0) {
      i_bokasi = 100;
    }
    console.log("update image");
    const base64temp = img_base64.split(",")[1];
    img_org = new Buffer.from(base64temp, "base64");
    Jimp.read(img_org)
      .then((image) => {
        image.blur(i_bokasi);
        image.getBase64(Jimp.MIME_JPEG, function (err, src) {
          io.sockets.emit("update_image", src);
        });
      })
      .catch((err) => {
        console.log("reading image error");
      });

    interval_1sec = setInterval(Update_bokasi, 500);
  }
}

function Update_bokasi() {
  Jimp.read(img_org)
    .then((image2) => {
      image2.blur(Math.max(i_bokasi, 1));
      image2.getBase64(Jimp.MIME_JPEG, function (err, src) {
        io.sockets.emit("update_image", src);
        console.log("update image");
        i_bokasi = i_bokasi - 5;
      });
    })
    .catch((err) => {
      console.log("reading image error");
      console.log(err);
    });
  if (i_bokasi < 0) {
    
    clearInterval(interval_1sec);
  }
}
