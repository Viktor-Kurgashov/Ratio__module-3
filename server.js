const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const fs = require('fs');



let timer = {
  clear() { this.from = undefined; },

  start () { this.from = Date.now() },

  finish () {
    const diff = Math.round((Date.now() - this.from) / 1000).toString();
    this.clear();
    return diff;
  },

  from: undefined
}



const server = http.createServer((req, res) => {
  switch (req.url) {
    case '/':
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.readFile('public/index.html', (err, data) => res.end(data));
      break;

    case '/styles.css':
      res.writeHead(200, { 'Content-Type': 'text/css' });
      fs.readFile('public/styles.css', (err, data) => res.end(data));
      break;

    case '/script.js':
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.readFile('public/script.js', (err, data) => res.end(data));
      break;

    case '/favicon.ico':
      res.writeHead(200, { 'Content-Type': 'image/vnd.microsoft.icon' });
      fs.readFile('public/favicon.ico', (err, data) => res.end(data));
      break;



    case '/api/v1/timer':  // req.method: 'POST', req.body: 'text/plain'
      let body = [], answer = '';

      req.on('data', chunk => body.push(chunk));

      req.on('end', () => {
        body = Buffer.concat(body).toString();

        if (body === 'clear') timer.clear();

        else if (body === 'start') timer.start();

        else if (body === 'finish') answer = timer.finish();

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(answer);
      });

      break;



    case '/api/v1/record':
      const url = 'mongodb+srv://ratio3:1234@cluster0.r4pfq.mongodb.net/db1?retryWrites=true&w=majority';

      // вызов records.send() на фронте, req.body - json со свойствами: name - имя введённое в форму после победы
      // и time - результат timer.finish() на бэке - время, затраченное на игру в милисекундах
      // res.body - id новой записи в базе данных

      if (req.method === 'POST') {
        let body = [];

        req.on('data', chunk => body.push(chunk));

        req.on('end', async () => {
          const client = await MongoClient.connect(url);

          const msg = await client.db('db1')
            .collection('coll1')
            .insertOne(JSON.parse(
              Buffer.concat(body).toString()
            ));

          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(msg.insertedId.toString());
          
          client.close();
        });
      }

      else if (req.method === 'GET') {  // вызов records.get() на фронте, возвращает рекорды из бд
        (async () => {
          const client = await MongoClient.connect(url);

          const data = await client.db('db1')
            .collection('coll1')
            .find({})
            .toArray();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));

          client.close();
        })();
      }

      break;
  }
});



server.listen(3000, 'localhost');